#!/usr/bin/env python3
"""Scrape only the newly added URLs with delays to avoid rate limits"""

import asyncio
import time
from scraper.scraper import SchemeScraper
from scraper.sources import SOURCES

async def scrape_new_sources_only():
    scraper = SchemeScraper()
    
    # Only the newly added URLs
    new_sources = [
        {
            "name": "SCW Department of Social Justice",
            "url": "https://scw.dosje.gov.in/",
            "category": "Social Welfare"
        },
        {
            "name": "NSAP Department of Rural Development", 
            "url": "https://nsap.dord.gov.in/",
            "category": "National Schemes"
        },
        {
            "name": "SCW Senior Care Ageing Growth",
            "url": "https://scw.dosje.gov.in/seniorcare-ageing-growth-",
            "category": "Elderly Schemes"
        },
        {
            "name": "MyScheme PSOP Engine",
            "url": "https://www.myscheme.gov.in/schemes/psoapengine",
            "category": "National Schemes"
        }
    ]
    
    print(f"🕷️ Scraping {len(new_sources)} new sources with delays...")
    
    for i, source in enumerate(new_sources):
        print(f"\n📄 Processing {i+1}/{len(new_sources)}: {source['name']}")
        print(f"   URL: {source['url']}")
        
        try:
            # Add delay between requests to avoid rate limits
            if i > 0:
                print("   ⏳ Waiting 30 seconds to avoid rate limits...")
                await asyncio.sleep(30)
            
            await scraper.scrape_source(source)
            print(f"   ✅ Completed: {source['name']}")
            
        except Exception as e:
            print(f"   ❌ Error scraping {source['name']}: {e}")
            continue
    
    print(f"\n🎉 Scrape completed!")
    
    # Check results
    from motor.motor_asyncio import AsyncIOMotorClient
    from config import settings
    
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.DATABASE_NAME]
    
    total_new = 0
    for source in new_sources:
        count = await db.schemes.count_documents({"source_url": source["url"]})
        total_new += count
        print(f"📊 {source['name']}: {count} schemes")
    
    print(f"📈 Total new schemes added: {total_new}")
    client.close()

if __name__ == "__main__":
    asyncio.run(scrape_new_sources_only())
