#!/usr/bin/env python3
"""
Test script to debug the chatbot functionality
"""
import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from agents.react_agent import ReActAgent
from config import settings

async def test_chatbot():
    """Test the chatbot with a simple query"""
    print("=== Testing Chatbot ===")
    
    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient(settings.MONGO_URI)
        db = client[settings.DATABASE_NAME]
        
        # Get a test user (first user in database)
        user = await db.users.find_one()
        if not user:
            print("❌ No users found in database")
            return
        
        user_id = str(user["_id"])
        print(f"👤 Testing with user: {user.get('full_name', 'Unknown')} (ID: {user_id})")
        print(f"📊 User profile: Age={user.get('age')}, Income={user.get('income_annual')}, Location={user.get('location')}")
        
        # Create ReAct agent
        agent = ReActAgent(user_id, "test-session", db)
        
        # Test queries
        test_queries = [
            "What pension schemes are available?",
            "Tell me about healthcare benefits",
            "Financial assistance for elderly"
        ]
        
        for query in test_queries:
            print(f"\n🔍 Testing query: '{query}'")
            print("-" * 50)
            
            try:
                result = await agent.run(query)
                print(f"✅ Response: {result.get('response', 'No response')[:200]}...")
                print(f"📊 Steps taken: {result.get('steps_taken', 0)}")
                print(f"🎯 Schemes found: {len(result.get('scheme_cards', []))}")
                
                if result.get('scheme_cards'):
                    print("📋 Schemes:")
                    for i, scheme in enumerate(result.get('scheme_cards', [])[:3]):
                        print(f"  {i+1}. {scheme.get('title', 'No title')}")
                
            except Exception as e:
                print(f"❌ Error: {e}")
                import traceback
                traceback.print_exc()
        
        await client.close()
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

async def test_tools_directly():
    """Test the tools directly"""
    print("\n=== Testing Tools Directly ===")
    
    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient(settings.MONGO_URI)
        db = client[settings.DATABASE_NAME]
        
        from agents.tools import AgentTools
        
        tools = AgentTools(db)
        
        # Test search_schemes
        print("\n🔍 Testing search_schemes...")
        schemes = await tools.search_schemes("pension")
        print(f"✅ Found {len(schemes)} schemes")
        for scheme in schemes[:3]:
            print(f"  - {scheme.get('title', 'No title')}")
        
        await client.close()
        
    except Exception as e:
        print(f"❌ Tools test failed: {e}")
        import traceback
        traceback.print_exc()

async def main():
    """Main test function"""
    print("Chatbot Debug Tool")
    print("=" * 50)
    
    # Test tools first
    await test_tools_directly()
    
    # Test chatbot
    await test_chatbot()
    
    print("\n" + "=" * 50)
    print("Test complete!")

if __name__ == "__main__":
    asyncio.run(main())
