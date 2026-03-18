import chromadb
from chromadb.config import Settings as ChromaSettings
import google.generativeai as genai
from typing import List, Dict, Any, Optional
from config import settings

class ChromaDB:
    def __init__(self):
        self.client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
        self.collection = self.client.get_or_create_collection(name="schemes")
        
        # Configure Google AI with the new API
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            print(f"[CHROMA] Configured with embedding model: {settings.EMBEDDING_MODEL}")
        except Exception as e:
            print(f"[CHROMA] Error configuring Google AI: {e}")

    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for the given text using multiple fallback methods."""
        # Method 1: Try Gemini embeddings
        try:
            result = genai.embed_content(
                model=settings.EMBEDDING_MODEL,
                content=text,
                task_type="retrieval_document"
            )
            return result['embedding']
        except Exception as e:
            print(f"Gemini embedding failed: {e}")
        
        # Method 2: Simple text-based embedding fallback
        try:
            # Create a simple hash-based embedding for demonstration
            import hashlib
            
            # Generate a deterministic vector based on text hash
            hash_obj = hashlib.md5(text.encode())
            hash_hex = hash_obj.hexdigest()
            
            # Convert hash to numeric vector (1536 dimensions for compatibility)
            embedding = []
            for i in range(0, len(hash_hex), 2):
                hex_pair = hash_hex[i:i+2]
                if len(hex_pair) == 2:
                    val = int(hex_pair, 16) / 255.0  # Normalize to 0-1
                    embedding.append(val)
            
            # Pad or truncate to 1536 dimensions (matching existing collection)
            while len(embedding) < 1536:
                embedding.append(0.0)
            embedding = embedding[:1536]
            
            return embedding
            
        except Exception as e:
            print(f"Fallback embedding also failed: {e}")
            return []

    async def ingest_scheme(self, scheme_data: Dict[str, Any], mongo_id: str):
        """Ingest a single scheme into ChromaDB with OpenAI embeddings."""
        # Combine title, description, and eligibility for embedding
        combined_text = f"{scheme_data.get('title', '')} {scheme_data.get('description', '')} {scheme_data.get('eligibility', '')}"
        
        # Generate embedding
        embedding = await self.generate_embedding(combined_text)
        if not embedding:
            return False
        
        # Prepare metadata
        metadata = {
            "mongo_id": mongo_id,
            "title": scheme_data.get("title", ""),
            "category": scheme_data.get("category", ""),
            "source_url": scheme_data.get("source_url", "")
        }
        
        try:
            # Use mongo_id as the document ID for uniqueness
            self.collection.add(
                embeddings=[embedding],
                documents=[combined_text],
                metadatas=[metadata],
                ids=[mongo_id]
            )
            return True
        except Exception as e:
            print(f"Error adding to ChromaDB: {e}")
            return False

    async def ingest_schemes_batch(self, schemes: List[Dict[str, Any]]):
        """Ingest multiple schemes into ChromaDB."""
        success_count = 0
        
        for scheme in schemes:
            mongo_id = scheme.get("_id", str(hash(scheme.get("title", ""))))
            success = await self.ingest_scheme(scheme, mongo_id)
            if success:
                success_count += 1
        
        print(f"Successfully ingested {success_count}/{len(schemes)} schemes into ChromaDB")
        return success_count

    async def similarity_search(self, query: str, n: int = 5) -> List[Dict[str, Any]]:
        """Return top-N matching scheme IDs based on similarity search."""
        try:
            # Generate embedding for the query
            query_embedding = await self.generate_embedding(query)
            if not query_embedding:
                return []
            
            # Perform similarity search
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n
            )
            
            # Format results
            matches = []
            if results['ids'] and results['ids'][0]:
                for i, doc_id in enumerate(results['ids'][0]):
                    match = {
                        "mongo_id": doc_id,
                        "title": results['metadatas'][0][i]['title'],
                        "category": results['metadatas'][0][i]['category'],
                        "source_url": results['metadatas'][0][i]['source_url'],
                        "score": results['distances'][0][i] if 'distances' in results else None
                    }
                    matches.append(match)
            
            return matches
            
        except Exception as e:
            print(f"Error in similarity search: {e}")
            return []

    def get_all_schemes(self) -> List[Dict[str, Any]]:
        """Get all schemes from ChromaDB."""
        try:
            results = self.collection.get()
            schemes = []
            
            if results['ids']:
                for i, doc_id in enumerate(results['ids']):
                    schemes.append({
                        "mongo_id": doc_id,
                        "title": results['metadatas'][i]['title'],
                        "category": results['metadatas'][i]['category'],
                        "source_url": results['metadatas'][i]['source_url']
                    })
            
            return schemes
            
        except Exception as e:
            print(f"Error getting all schemes: {e}")
            return []

    def delete_scheme(self, mongo_id: str) -> bool:
        """Delete a scheme from ChromaDB by mongo_id."""
        try:
            self.collection.delete(ids=[mongo_id])
            return True
        except Exception as e:
            print(f"Error deleting scheme: {e}")
            return False

# Global instance
chroma_client = ChromaDB()

async def similarity_search(query: str, n: int = 5) -> List[Dict[str, Any]]:
    """Global function to perform similarity search on schemes."""
    return await chroma_client.similarity_search(query, n)
