import httpx
import os
from config import settings
import google.generativeai as genai

class RateLimitError(Exception):
    """Custom exception for rate limit errors"""
    pass

async def call_gemini(prompt: str, max_tokens: int = 500) -> str:
    """
    Call Gemini API - primary LLM provider
    Better Kerala knowledge, free tier available
    """
    api_key = os.getenv('GEMINI_API_KEY')
    
    if not api_key:
        print("❌ GEMINI_API_KEY not found in .env")
        raise Exception("Gemini API key not configured")
    
    try:
        genai.configure(api_key=api_key)
        # Use the correct model name for current API version
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        response = model.generate_content(prompt)
        content = response.text.strip()
        print(f"✅ Gemini response received ({len(content)} chars)")
        return content
    except Exception as e:
        print(f"❌ Gemini error: {e}")
        raise Exception(f"Gemini API error: {e}")

async def call_openrouter(prompt: str, max_tokens: int = 50) -> str:
    """
    Call OpenRouter API - backup LLM provider
    Multiple model options, pay-as-you-go
    """
    api_key = os.getenv('OPENROUTER_API_KEY')
    
    if not api_key:
        print("❌ OPENROUTER_API_KEY not found in .env")
        raise Exception("OpenRouter API key not configured")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "openrouter/auto",  # Auto-select best available model
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens  # Reduced to 200 to save credits
                }
            )
            
            if response.status_code == 429:
                raise RateLimitError(f"OpenRouter rate limit exceeded: {response.text}")
            elif response.status_code != 200:
                print(f"❌ OpenRouter error {response.status_code}: {response.text[:200]}")
                raise Exception(f"OpenRouter API error: {response.status_code}")
            
            content = response.json()["choices"][0]["message"]["content"].strip()
            print(f"✅ OpenRouter response received ({len(content)} chars)")
            return content
            
    except httpx.TimeoutException:
        print("❌ OpenRouter timeout")
        raise Exception("OpenRouter API timeout")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            raise RateLimitError("OpenRouter rate limit exceeded")
        raise

async def call_llm(prompt: str, max_tokens: int = 50) -> str:
    """
    Main LLM caller with automatic fallback
    Primary: Gemini (better Kerala knowledge, stable)
    Backup: OpenRouter (multiple models, reliable)
    """
    # Try Gemini first
    try:
        return await call_gemini(prompt, max_tokens)
    except RateLimitError as e:
        print(f"⚠️ Gemini rate limit hit, falling back to OpenRouter: {e}")
        try:
            return await call_openrouter(prompt, max_tokens)
        except Exception as openrouter_error:
            print(f"❌ Both LLMs failed. Gemini: {e}, OpenRouter: {openrouter_error}")
            return ""
    except Exception as e:
        print(f"❌ Gemini failed, trying OpenRouter: {e}")
        try:
            return await call_openrouter(prompt, max_tokens)
        except Exception as openrouter_error:
            print(f"❌ Both LLMs failed. Gemini: {e}, OpenRouter: {openrouter_error}")
            return ""
