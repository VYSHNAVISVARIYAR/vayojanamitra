import asyncio
import logging
import json
import os
import time
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
from motor.motor_asyncio import AsyncIOMotorClient
from urllib.parse import urljoin, urlparse
from datetime import datetime, timedelta
from scraper.sources import SOURCES
from config import settings
from models.scheme_schema import SchemeCreate
from db.chroma import chroma_client
from db.mongo import get_db
from utils.llm_rotator import llm_rotator
import hashlib

# Response cache for scraper (ZERO TOKENS for duplicate scrapes)
class ScraperCache:
    def __init__(self):
        self.cache = {}  # in-memory cache
    
    def get_key(self, text: str) -> str:
        return hashlib.md5(text.encode()).hexdigest()[:16]
    
    def get(self, text: str):
        key = self.get_key(text)
        return self.cache.get(key)
    
    def set(self, text: str, response: str):
        key = self.get_key(text)
        self.cache[key] = response

scraper_cache = ScraperCache()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_text_from_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    
    # Remove noise
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    
    # Get meaningful text
    texts = []
    for tag in soup.find_all(["p", "h1", "h2", "h3", "h4", "li", "td", "span"]):
        t = tag.get_text(separator=" ", strip=True)
        if len(t) > 30:  # skip very short fragments
            texts.append(t)
    
    # CHANGE: Reduce to 2000 chars instead of full text (75% savings!)
    return "\n".join(texts)[:2000]

async def fetch_html(url: str) -> str:
    """Helper to fetch HTML from a URL with rate limiting."""
    # Government URLs that need special handling
    government_urls = [
        "https://sjd.kerala.gov.in/schemes.php",
        "https://www.india.gov.in/category/benefits-social-development/subcategory/senior-citizens", 
        "https://nsap.nic.in/",
        "https://socialsecuritymission.gov.in/schemes/",
        "https://www.india.gov.in/my-government/schemes",
        "https://nsap.dord.gov.in/",
        "https://scw.dosje.gov.in/",
        "https://scw.dosje.gov.in/seniorcare-ageing-growth-",
        "https://www.myscheme.gov.in/search?keyword=kerala",
        "https://www.myscheme.gov.in/schemes/social-welfare?state=kerala",
        "https://www.myscheme.gov.in/schemes/health?state=kerala",
        "https://www.myscheme.gov.in/schemes/agriculture?state=kerala",
        "https://kerala.data.gov.in/search/type/dataset?keyword=welfare+scheme",
        "https://welfarepension.lsgkerala.gov.in",
        "https://nrhm.kerala.gov.in",
        "https://www.keralaagriculture.gov.in/en/farmer-welfare/",
        "https://keralaagriculture.gov.in/en/schemes/",
        "https://www.kerala.gov.in/housing-schemes",
        "https://www.kudumbashree.org/pages/163",
        "https://labour.kerala.gov.in/schemes/",
        "https://sjd.kerala.gov.in/programmes.php",
        "https://karunyakerala.org/",
        "https://www.matsyafed.com/schemes",
        "https://scstkerala.gov.in/schemes",
        "https://minoritywelfare.kerala.gov.in/schemes/",
        "https://wcd.kerala.gov.in/schemes/",
        "https://edistrict.kerala.gov.in/e-district/",
        "https://alimco.in/schemes/rashtriya-vayoshri-yojana",
        "https://www.myscheme.gov.in/schemes/psoapengine"
    ]
    
    # Check if this is a government server URL
    is_government_url = any(gov_url in url for gov_url in government_urls)
    
    # Add delay before request for government servers
    if is_government_url:
        logger.info(f"⏱️ Rate limiting: Waiting 2 seconds before requesting: {url}")
        await asyncio.sleep(2)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Add headers to mimic real browser and avoid bot detection
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        return response.text

def clean_document_requirements(documents: list) -> list:
    """Clean and validate document requirements list."""
    if not documents or not isinstance(documents, list):
        return []
    
    cleaned_docs = []
    for doc in documents:
        if not doc or doc == "Not specified":
            continue
            
        # Clean up the document name
        cleaned_doc = doc.strip()
        
        # Remove common prefixes/suffixes
        prefixes_to_remove = ["Copy of ", "Original ", "Self-attested "]
        for prefix in prefixes_to_remove:
            if cleaned_doc.startswith(prefix):
                cleaned_doc = cleaned_doc[len(prefix):]
        
        # Capitalize properly
        cleaned_doc = cleaned_doc.title()
        
        # Skip if too short or too generic
        if len(cleaned_doc) < 3 or cleaned_doc.lower() in ["id", "proof", "card"]:
            continue
            
        cleaned_docs.append(cleaned_doc)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_docs = []
    for doc in cleaned_docs:
        if doc not in seen:
            seen.add(doc)
            unique_docs.append(doc)
    
    return unique_docs

async def extract_schemes_with_ai(raw_text: str, source_url: str) -> list:
    # Check cache first (ZERO TOKENS if cached)
    cached = scraper_cache.get(raw_text)
    if cached:
        print("📦 Scraper cache hit — zero tokens used!")
        return cached
    
    # Clean and trim text first
    clean_text = " ".join(raw_text.split())[:settings.MAX_TEXT_LENGTH]  # limit text length
    
    if len(clean_text) < settings.MIN_TEXT_LENGTH:
        print(f"⚠️ Too little text extracted from {source_url}")
        return []

    prompt = f"""Extract Kerala welfare schemes from text.
Rules:
1. Extract EVERY scheme mentioned
2. Categories: pension/healthcare/housing/disability/agriculture/education/women/general
3. Use "Not specified" for missing data
4. Return ONLY JSON array

Each scheme: {{"title":"...","description":"...","benefits":"...","eligibility":"...","documents_required":["doc1","doc2"],"category":"...","state":"Kerala"}}

Text: {clean_text}"""

    try:
        # Use Groq first for scraping (faster JSON extraction)
        content = await llm_rotator.call(
            prompt,
            max_tokens=1000,
            prefer="groq"  # Groq first for scraping
        )
        
        if not content:
            print(f"❌ Empty response for {source_url}")
            return []
        
        # Parse JSON response
        # Clean potential markdown code blocks
        if content.startswith("```"):
            lines = content.splitlines()
            if lines[0].startswith("```json"):
                content = "\n".join(lines[1:-1])
            elif lines[0].startswith("```"):
                content = "\n".join(lines[1:-1])
                
        schemes = json.loads(content)
        
        # Clean and validate document requirements for each scheme
        for scheme in schemes:
            if 'documents_required' in scheme:
                scheme['documents_required'] = clean_document_requirements(scheme['documents_required'])
        
        print(f"✅ Extracted {len(schemes)} schemes from {source_url}")
        
        # Cache the response
        scraper_cache.set(raw_text, schemes)
        
        return schemes

    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error for {source_url}: {e}")
        if 'content' in locals():
            print(f"Raw response: {content[:300]}")
        return []
    except Exception as e:
        print(f"❌ LLM error for {source_url}: {e}")
        return []

class SchemeScraper:
    def __init__(self):
        # Check if Groq API key is available
        if settings.GROQ_API_KEY:
            self.llm_available = True
        else:
            self.llm_available = False
            
        self.mongo_client = AsyncIOMotorClient(settings.MONGO_URI)
        self.db = self.mongo_client[settings.DATABASE_NAME]
        self.schemes_collection = self.db.schemes

    async def extract_page_content(self, url: str) -> Optional[Dict[str, Any]]:
        """Extract title, paragraphs, and scheme names from a webpage."""
        try:
            # Add random delay to avoid rate limiting
            await asyncio.sleep(1)
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                
            # Use improved HTML text extraction
            clean_text = extract_text_from_html(response.content.decode('utf-8'))
            
            # Extract page title
            soup = BeautifulSoup(response.content, 'html.parser')
            title = soup.find('title')
            page_title = title.get_text().strip() if title else "No title found"
            
            print(f"--- TEXT EXTRACTED FROM {url} ---")
            print(clean_text[:1000])  # print first 1000 chars
            print("---")
            
            return {
                "url": url,
                "title": page_title,
                "paragraphs": clean_text,
                "scheme_elements": []  # Not needed with new approach
            }
            
        except Exception as e:
            logger.error(f"Error extracting content from {url}: {e}")
            return None

    async def parse_schemes_with_ai(self, content: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Use OpenRouter to parse raw text into structured scheme format."""
        if not content:
            return []
            
        # Check if LLM API key is valid
        if not self.llm_available:
            logger.warning("GROQ API key not set, using fallback extraction")
            return []
            
        # Use the new LLM extraction function
        return await extract_schemes_with_ai(content['paragraphs'], content['url'])

    async def upsert_schemes(self, schemes: List[Dict[str, Any]], source_url: str):
        """Upsert schemes into MongoDB and ChromaDB using source_url as unique key."""
        if not schemes:
            return
            
        try:
            for scheme_data in schemes:
                # Add source_url if not present
                scheme_data["source_url"] = source_url
                
                # Create scheme document
                scheme_doc = SchemeCreate(**scheme_data)
                
                # Upsert using source_url as unique key
                result = await self.schemes_collection.update_one(
                    {"source_url": source_url, "title": scheme_data.get("title", "")},
                    {"$set": scheme_doc.model_dump()},
                    upsert=True
                )
                
                if result.upserted_id:
                    logger.info(f"Created new scheme: {scheme_data.get('title', 'Unknown')}")
                    mongo_id = str(result.upserted_id)
                else:
                    logger.info(f"Updated existing scheme: {scheme_data.get('title', 'Unknown')}")
                    # Get the existing document ID
                    existing_doc = await self.schemes_collection.find_one(
                        {"source_url": source_url, "title": scheme_data.get("title", "")}
                    )
                    mongo_id = str(existing_doc["_id"]) if existing_doc else None
                
                # Ingest into ChromaDB if we have a mongo_id
                if mongo_id:
                    scheme_for_chroma = scheme_data.copy()
                    scheme_for_chroma["_id"] = mongo_id
                    await chroma_client.ingest_scheme(scheme_for_chroma, mongo_id)
                    
        except Exception as e:
            logger.error(f"Error upserting schemes: {e}")

    async def scrape_source(self, source: Dict[str, Any]):
        """Scrape a single source URL."""
        logger.info(f"Scraping {source['name']} - {source['url']}")
        
        try:
            # Extract content from the webpage
            content = await self.extract_page_content(source['url'])
            if not content:
                logger.error(f"Failed to extract content from {source['url']}")
                return
                
            # Parse schemes using AI
            schemes = await self.parse_schemes_with_ai(content)
            
            # Upsert to database
            await self.upsert_schemes(schemes, source['url'])
            
            logger.info(f"Successfully processed {source['url']}: found {len(schemes)} schemes")
            
        except Exception as e:
            logger.error(f"Error scraping {source['url']}: {e}")

    async def scrape_all_sources(self):
        """Scrape all sources from the SOURCES list sequentially with delays."""
        logger.info("Starting to scrape all sources sequentially...")
        
        # Government server URLs that need special handling
        government_urls = [
            "https://sjd.kerala.gov.in/schemes.php",
            "https://www.india.gov.in/category/benefits-social-development/subcategory/senior-citizens", 
            "https://nsap.nic.in/",
            "https://socialsecuritymission.gov.in/schemes/",
            "https://www.india.gov.in/my-government/schemes",
            "https://nsap.dord.gov.in/",
            "https://scw.dosje.gov.in/",
            "https://scw.dosje.gov.in/seniorcare-ageing-growth-",
            "https://www.myscheme.gov.in/search?keyword=kerala",
            "https://www.myscheme.gov.in/schemes/social-welfare?state=kerala",
            "https://www.myscheme.gov.in/schemes/health?state=kerala",
            "https://www.myscheme.gov.in/schemes/agriculture?state=kerala",
            "https://kerala.data.gov.in/search/type/dataset?keyword=welfare+scheme",
            "https://welfarepension.lsgkerala.gov.in",
            "https://nrhm.kerala.gov.in",
            "https://www.keralaagriculture.gov.in/en/farmer-welfare/",
            "https://www.kerala.gov.in/housing-schemes",
            "https://www.kudumbashree.org/pages/163",
            "https://labour.kerala.gov.in/schemes/",
            "https://sjd.kerala.gov.in/programmes.php",
            "https://karunyakerala.org/",
            "https://www.matsyafed.com/schemes",
            "https://scstkerala.gov.in/schemes",
            "https://minoritywelfare.kerala.gov.in/schemes/",
            "https://wcd.kerala.gov.in/schemes/",
            "https://edistrict.kerala.gov.in/e-district/",
            "https://alimco.in/schemes/rashtriya-vayoshri-yojana",
            "https://www.myscheme.gov.in/schemes/psoapengine"
        ]
        
        for i, source in enumerate(SOURCES):
            try:
                logger.info(f"Processing source {i+1}/{len(SOURCES)}: {source['name']}")
                
                # Scrape this source
                await self.scrape_source(source)
                
                # Check if this is a government server URL
                is_government_url = any(gov_url in source['url'] for gov_url in government_urls)
                
                # Add delay for government servers to prevent overloading
                if is_government_url:
                    logger.info(f"⏱️ Adding 2-second delay for government server: {source['url']}")
                    await asyncio.sleep(2)
                else:
                    # Shorter delay for non-government URLs
                    await asyncio.sleep(0.5)
                    
            except Exception as e:
                logger.error(f"Error processing source {source['name']}: {e}")
                # Continue with next source even if this one fails
                continue
        
        logger.info("Completed scraping all sources sequentially")

async def scrape_schemes():
    """Main function to run the scraper."""
    scraper = SchemeScraper()
    
    # Debug logging to check which sources return schemes
    results_summary = {}
    
    for source in SOURCES:
        try:
            # Check if URL was scraped in last 12 hours (ZERO TOKENS if recently scraped)
            from datetime import datetime, timedelta
            from db.mongo import get_db
            
            db = get_db()
            last_scrape = await db.scrape_logs.find_one({
                "url": source["url"],
                "status": "success",
                "scraped_at": {
                    "$gte": datetime.utcnow() - timedelta(hours=12)
                }
            })
            
            if last_scrape:
                print(f"\n⏭️ Skipping {source['name']} — scraped recently (ZERO tokens!)")
                results_summary[source["name"]] = 0
                continue
            
            html = await fetch_html(source["url"])
            text = extract_text_from_html(html)
            
            print(f"\n🔍 {source['name']}")
            print(f"   Text length: {len(text)} chars")
            
            if len(text) < 200:
                print(f"   ⚠️ SKIPPED — too little text")
                results_summary[source["name"]] = 0
                continue
            
            schemes = await extract_schemes_with_ai(text, source["url"])
            results_summary[source["name"]] = len(schemes)
            print(f"   ✅ Extracted: {len(schemes)} schemes")
            
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
            results_summary[source["name"]] = 0
    
    print("\n📊 FINAL SCRAPING SUMMARY:")
    for source, count in results_summary.items():
        status = "✅" if count > 0 else "❌"
        print(f"  {status} {source}: {count} schemes")
    
    total = sum(results_summary.values())
    print(f"\n🎯 Total extracted this run: {total}")
    
    # Also run the normal scraper process
    await scraper.scrape_all_sources()

if __name__ == "__main__":
    asyncio.run(scrape_schemes())
