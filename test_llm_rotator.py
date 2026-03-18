#!/usr/bin/env python3
"""
Test script for LLM Rotator functionality
Demonstrates multi-key rotation and fallback behavior
"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "vayojanamitra" / "backend"
sys.path.insert(0, str(backend_path))

from utils.llm_rotator import llm_rotator

async def test_basic_calls():
    """Test basic LLM calls with rotation"""
    print("🧪 Testing Basic LLM Calls")
    print("=" * 50)
    
    # Test Gemini preference
    print("\n1. Testing Gemini preference:")
    try:
        response = await llm_rotator.call(
            "What is 2+2? Answer with just the number.",
            max_tokens=10,
            prefer="gemini"
        )
        print(f"✅ Gemini response: {response}")
    except Exception as e:
        print(f"❌ Gemini failed: {e}")
    
    # Test Groq preference
    print("\n2. Testing Groq preference:")
    try:
        response = await llm_rotator.call(
            "What is 3+3? Answer with just the number.",
            max_tokens=10,
            prefer="groq"
        )
        print(f"✅ Groq response: {response}")
    except Exception as e:
        print(f"❌ Groq failed: {e}")

async def test_rotation():
    """Test key rotation under load"""
    print("\n🔄 Testing Key Rotation")
    print("=" * 50)
    
    # Make multiple rapid calls to test rotation
    tasks = []
    for i in range(10):
        task = llm_rotator.call(
            f"Quick test {i+1}: What is {i+1}+{i+1}? Answer with just the number.",
            max_tokens=10,
            prefer="gemini"
        )
        tasks.append(task)
    
    print("Making 10 concurrent calls...")
    responses = await asyncio.gather(*tasks, return_exceptions=True)
    
    success_count = 0
    for i, response in enumerate(responses):
        if isinstance(response, Exception):
            print(f"❌ Call {i+1} failed: {response}")
        else:
            print(f"✅ Call {i+1}: {response}")
            success_count += 1
    
    print(f"\n📊 Success rate: {success_count}/10 ({success_count*10}%)")

async def test_fallback():
    """Test fallback from preferred to backup provider"""
    print("\n🔄 Testing Provider Fallback")
    print("=" * 50)
    
    # This will test the automatic fallback mechanism
    print("Testing with Gemini preference (should fallback to Groq if needed):")
    try:
        response = await llm_rotator.call(
            "Explain what a pension scheme is in one sentence.",
            max_tokens=50,
            prefer="gemini"
        )
        print(f"✅ Response: {response}")
    except Exception as e:
        print(f"❌ All providers failed: {e}")

async def show_stats():
    """Display current statistics"""
    print("\n📊 Current LLM Rotator Stats")
    print("=" * 50)
    
    stats = llm_rotator.get_stats()
    
    print(f"Gemini keys loaded: {stats['keys_loaded']['gemini']}")
    print(f"Groq keys loaded: {stats['keys_loaded']['groq']}")
    print(f"OpenRouter keys loaded: {stats['keys_loaded']['openrouter']}")
    print(f"Gemini calls today: {stats['calls_today']['gemini']}")
    print(f"Groq calls today: {stats['calls_today']['groq']}")
    print(f"OpenRouter calls today: {stats['calls_today']['openrouter']}")
    print(f"Failed calls: {stats['calls_today']['failed']}")
    print(f"Blocked keys: {stats['blocked_keys']}")
    print(f"Total calls: {stats['calls_today']['total']}")
    print(f"Tokens per day estimate: {stats['tokens_per_day_estimate']['total_guaranteed']:,}")

async def test_real_scenario():
    """Test a real scenario like scheme extraction"""
    print("\n🏛️ Testing Real Scenario: Scheme Extraction")
    print("=" * 50)
    
    scheme_text = """
    The Kerala Social Security Pension Scheme provides monthly financial assistance 
    to elderly citizens above 60 years. Eligibility: Age 60+, annual income below 1 lakh.
    Benefits: Rs. 1600 per month. Documents required: Aadhaar card, income certificate, 
    age proof. Apply through Akshaya centers.
    """
    
    prompt = f"""
    Extract the scheme information from this text:
    {scheme_text}
    
    Return JSON with: title, eligibility, benefits, documents_required
    """
    
    try:
        # Use Groq for JSON extraction (faster)
        response = await llm_rotator.call(
            prompt,
            max_tokens=200,
            prefer="groq"
        )
        print(f"✅ Extracted scheme info: {response}")
    except Exception as e:
        print(f"❌ Extraction failed: {e}")

async def main():
    """Run all tests"""
    print("🚀 LLM Rotator Test Suite")
    print("=" * 60)
    
    # Check if keys are configured
    stats = llm_rotator.get_stats()
    if stats['keys_loaded']['gemini'] == 0 and stats['keys_loaded']['groq'] == 0:
        print("❌ No API keys found! Please configure your .env file:")
        print("   GEMINI_API_KEY_1=your_key_here")
        print("   GROQ_API_KEY_1=your_key_here")
        return
    
    print(f"✅ Found {stats['keys_loaded']['gemini']} Gemini keys and {stats['keys_loaded']['groq']} Groq keys")
    
    # Run tests
    await test_basic_calls()
    await test_rotation()
    await test_fallback()
    await test_real_scenario()
    await show_stats()
    
    print("\n🎉 Test suite completed!")

if __name__ == "__main__":
    asyncio.run(main())
