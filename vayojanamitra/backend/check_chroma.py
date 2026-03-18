#!/usr/bin/env python3
"""
Script to check and populate ChromaDB with scheme data
"""
import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from db.chroma import chroma_client
from config import settings

async def check_chroma_data():
    """Check what data exists in ChromaDB"""
    print("=== Checking ChromaDB Data ===")
    
    try:
        # Get all schemes from ChromaDB
        all_schemes = chroma_client.get_all_schemes()
        print(f"ChromaDB contains {len(all_schemes)} schemes")
        
        if all_schemes:
            print("\nSample schemes in ChromaDB:")
            for i, scheme in enumerate(all_schemes[:3]):
                print(f"  {i+1}. {scheme['title']} (ID: {scheme['mongo_id']})")
        else:
            print("ChromaDB is empty!")
            
        return all_schemes
        
    except Exception as e:
        print(f"Error checking ChromaDB: {e}")
        return []

async def check_mongo_data():
    """Check what schemes exist in MongoDB"""
    print("\n=== Checking MongoDB Data ===")
    
    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient(settings.MONGO_URI)
        db = client[settings.DATABASE_NAME]
        
        # Count schemes
        scheme_count = await db.schemes.count_documents({})
        print(f"MongoDB contains {scheme_count} schemes")
        
        if scheme_count > 0:
            # Get sample schemes
            sample_schemes = await db.schemes.find().limit(3).to_list(3)
            print("\nSample schemes in MongoDB:")
            for i, scheme in enumerate(sample_schemes):
                print(f"  {i+1}. {scheme.get('title', 'No title')} (ID: {scheme['_id']})")
        else:
            print("MongoDB has no schemes!")
            
        await client.close()
        return scheme_count
        
    except Exception as e:
        print(f"Error checking MongoDB: {e}")
        return 0

async def populate_chroma():
    """Populate ChromaDB with data from MongoDB"""
    print("\n=== Populating ChromaDB ===")
    
    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient(settings.MONGO_URI)
        db = client[settings.DATABASE_NAME]
        
        # Get all schemes from MongoDB
        schemes = await db.schemes.find().to_list(1000)
        print(f"Found {len(schemes)} schemes in MongoDB")
        
        if not schemes:
            print("No schemes found in MongoDB to populate ChromaDB")
            return False
            
        # Convert ObjectId to string for ChromaDB
        schemes_for_chroma = []
        for scheme in schemes:
            scheme_dict = dict(scheme)
            scheme_dict["_id"] = str(scheme["_id"])
            schemes_for_chroma.append(scheme_dict)
        
        # Ingest into ChromaDB
        success_count = await chroma_client.ingest_schemes_batch(schemes_for_chroma)
        print(f"Successfully ingested {success_count}/{len(schemes)} schemes into ChromaDB")
        
        await client.close()
        return success_count > 0
        
    except Exception as e:
        print(f"Error populating ChromaDB: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_chroma_search():
    """Test ChromaDB search functionality"""
    print("\n=== Testing ChromaDB Search ===")
    
    test_queries = [
        "pension schemes",
        "healthcare benefits",
        "elderly welfare",
        "financial assistance"
    ]
    
    for query in test_queries:
        print(f"\nTesting query: '{query}'")
        try:
            results = await chroma_client.similarity_search(query, n=3)
            print(f"  Found {len(results)} results:")
            for i, result in enumerate(results):
                print(f"    {i+1}. {result['title']} (score: {result.get('score', 'N/A')})")
        except Exception as e:
            print(f"  Error: {e}")

async def main():
    """Main function"""
    print("ChromaDB Diagnostic Tool")
    print("=" * 50)
    
    # Check current state
    chroma_schemes = await check_chroma_data()
    mongo_schemes = await check_mongo_data()
    
    # Populate if needed
    if len(chroma_schemes) == 0 and mongo_schemes > 0:
        print("\nChromaDB is empty but MongoDB has data. Populating...")
        success = await populate_chroma()
        if success:
            print("✅ ChromaDB populated successfully!")
            # Verify population
            chroma_schemes = await check_chroma_data()
        else:
            print("❌ Failed to populate ChromaDB")
    elif len(chroma_schemes) == 0 and mongo_schemes == 0:
        print("\n❌ Both ChromaDB and MongoDB are empty!")
        print("Please run the data ingestion script first.")
    else:
        print("\n✅ ChromaDB already has data")
    
    # Test search if we have data
    if len(chroma_schemes) > 0:
        await test_chroma_search()
    
    print("\n" + "=" * 50)
    print("Diagnostic complete!")

if __name__ == "__main__":
    asyncio.run(main())
