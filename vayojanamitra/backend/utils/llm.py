import httpx
from config import settings

class RateLimitError(Exception):
    """Custom exception for rate limit errors"""
    pass

async def call_groq(prompt: str, max_tokens: int = 500) -> str:
    """
    Call Groq API - primary LLM provider
    Fast, free, works well for demo
    """
    api_key = settings.GROQ_API_KEY
    
    if not api_key:
        print("❌ GROQ_API_KEY not found in .env")
        raise Exception("Groq API key not configured")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.GROQ_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens
                }
            )
            
            if response.status_code == 429:
                raise RateLimitError(f"Groq rate limit exceeded: {response.text}")
            elif response.status_code != 200:
                print(f"❌ Groq error {response.status_code}: {response.text[:200]}")
                raise Exception(f"Groq API error: {response.status_code}")
            
            content = response.json()["choices"][0]["message"]["content"].strip()
            print(f"✅ Groq response received ({len(content)} chars)")
            return content
            
    except httpx.TimeoutException:
        print("❌ Groq timeout")
        raise Exception("Groq API timeout")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            raise RateLimitError("Groq rate limit exceeded")
        raise

async def call_gemini(prompt: str, max_tokens: int = 500) -> str:
    """
    Call Gemini API - backup LLM provider
    Better Kerala knowledge, free 1500/day
    """
    api_key = settings.GEMINI_API_KEY
    
    if not api_key:
        print("❌ GEMINI_API_KEY not found in .env")
        raise Exception("Gemini API key not configured")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={api_key}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "maxOutputTokens": max_tokens,
                        "temperature": 0.7
                    }
                }
            )
            
            if response.status_code == 429:
                raise RateLimitError(f"Gemini rate limit exceeded: {response.text}")
            elif response.status_code != 200:
                print(f"❌ Gemini error {response.status_code}: {response.text[:200]}")
                raise Exception(f"Gemini API error: {response.status_code}")
            
            content = response.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            print(f"✅ Gemini response received ({len(content)} chars)")
            return content
            
    except httpx.TimeoutException:
        print("❌ Gemini timeout")
        raise Exception("Gemini API timeout")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            raise RateLimitError("Gemini rate limit exceeded")
        raise
    except KeyError as e:
        print(f"❌ Gemini response format error: {e}")
        print(f"Response: {response.text[:500]}")
        raise Exception("Gemini API response format changed")

async def call_llm(prompt: str, max_tokens: int = 500) -> str:
    """
    Main LLM caller with automatic fallback
    Primary: Groq (fast, free, works well for demo)
    Backup: Gemini (better Kerala knowledge, free 1500/day)
    """
    # Try Groq first
    try:
        return await call_groq(prompt, max_tokens)
    except RateLimitError as e:
        print(f"⚠️ Groq rate limit hit, falling back to Gemini: {e}")
        try:
            return await call_gemini(prompt, max_tokens)
        except Exception as gemini_error:
            print(f"❌ Both LLMs failed. Groq: {e}, Gemini: {gemini_error}")
            return ""
    except Exception as e:
        print(f"❌ Groq failed, trying Gemini: {e}")
        try:
            return await call_gemini(prompt, max_tokens)
        except Exception as gemini_error:
            print(f"❌ Both LLMs failed. Groq: {e}, Gemini: {gemini_error}")
            return ""
