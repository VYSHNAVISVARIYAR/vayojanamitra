import os
import json
import time
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from enum import Enum
import httpx
import google.generativeai as genai
from dataclasses import dataclass, field

class Provider(Enum):
    GEMINI = "gemini"
    GROQ = "groq"

@dataclass
class APIKey:
    key: str
    provider: Provider
    index: int
    last_used: float = 0.0
    blocked_until: float = 0.0
    calls_today: int = 0
    failed_attempts: int = 0
    last_reset_date: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))

class LLMRotator:
    def __init__(self):
        self.gemini_keys: List[APIKey] = []
        self.groq_keys: List[APIKey] = []
        self.stats = {
            "gemini_calls_today": 0,
            "groq_calls_today": 0,
            "failed_calls": 0,
            "blocked_keys_count": 0,
            "total_calls": 0,
            "last_reset": datetime.now().strftime("%Y-%m-%d")
        }
        self._load_keys()
        self._setup_gemini()

    def _load_keys(self):
        """Load API keys from environment variables"""
        # Load Gemini keys
        for i in range(1, 4):
            key = os.getenv(f'GEMINI_API_KEY_{i}')
            if key:
                self.gemini_keys.append(APIKey(
                    key=key,
                    provider=Provider.GEMINI,
                    index=i
                ))
        
        # Load Groq keys
        for i in range(1, 4):
            key = os.getenv(f'GROQ_API_KEY_{i}')
            if key:
                self.groq_keys.append(APIKey(
                    key=key,
                    provider=Provider.GROQ,
                    index=i
                ))
        
        print(f"🔑 Loaded {len(self.gemini_keys)} Gemini keys and {len(self.groq_keys)} Groq keys")

    def _setup_gemini(self):
        """Setup Gemini models for each key"""
        for key_obj in self.gemini_keys:
            try:
                genai.configure(api_key=key_obj.key)
                # Test the key with a simple call
                model = genai.GenerativeModel('models/gemini-2.5-flash')
                # Don't make actual calls here, just setup
            except Exception as e:
                print(f"⚠️ Gemini key {key_obj.index} setup failed: {e}")

    def _reset_daily_counts(self):
        """Reset daily call counts if it's a new day"""
        today = datetime.now().strftime("%Y-%m-%d")
        if self.stats["last_reset"] != today:
            # Reset all key counts
            for key_obj in self.gemini_keys + self.groq_keys:
                key_obj.calls_today = 0
                key_obj.failed_attempts = 0
                key_obj.last_reset_date = today
            
            # Reset stats
            self.stats["gemini_calls_today"] = 0
            self.stats["groq_calls_today"] = 0
            self.stats["failed_calls"] = 0
            self.stats["last_reset"] = today
            print(f"📅 Daily counts reset for {today}")

    def _get_available_key(self, provider: Provider) -> Optional[APIKey]:
        """Get an available API key for the specified provider"""
        keys = self.gemini_keys if provider == Provider.GEMINI else self.groq_keys
        current_time = time.time()
        
        # Sort keys by availability (prefer least recently used, not blocked)
        available_keys = []
        for key_obj in keys:
            # Check if key is blocked
            if current_time < key_obj.blocked_until:
                continue
            
            # Check if key has failed too many times
            if key_obj.failed_attempts >= 3:
                # Block for 5 minutes after 3 failures
                key_obj.blocked_until = current_time + 300
                continue
            
            available_keys.append(key_obj)
        
        if not available_keys:
            return None
        
        # Sort by last_used time (use the one that hasn't been used recently)
        available_keys.sort(key=lambda k: k.last_used)
        return available_keys[0]

    async def _call_gemini(self, prompt: str, max_tokens: int = 500) -> str:
        """Call Gemini API with automatic key rotation"""
        key_obj = self._get_available_key(Provider.GEMINI)
        if not key_obj:
            raise Exception("No available Gemini keys")
        
        try:
            # Update last used time
            key_obj.last_used = time.time()
            key_obj.calls_today += 1
            self.stats["gemini_calls_today"] += 1
            self.stats["total_calls"] += 1
            
            # Setup Gemini with this key
            genai.configure(api_key=key_obj.key)
            model = genai.GenerativeModel('models/gemini-2.5-flash')
            
            # Make the call
            response = model.generate_content(prompt)
            content = response.text.strip()
            
            # Reset failed attempts on success
            key_obj.failed_attempts = 0
            
            print(f"✅ Gemini key {key_obj.index} successful ({len(content)} chars)")
            return content
            
        except Exception as e:
            key_obj.failed_attempts += 1
            error_msg = str(e).lower()
            
            # Check for rate limiting
            if "rate limit" in error_msg or "quota" in error_msg or "429" in error_msg:
                # Block for 60 seconds on rate limit
                key_obj.blocked_until = time.time() + 60
                print(f"⏱️ Gemini key {key_obj.index} rate limited, blocked for 60s")
                raise Exception(f"Rate limit: {e}")
            else:
                print(f"❌ Gemini key {key_obj.index} failed: {e}")
                raise Exception(f"Gemini API error: {e}")

    async def _call_groq(self, prompt: str, max_tokens: int = 500) -> str:
        """Call Groq API with automatic key rotation"""
        key_obj = self._get_available_key(Provider.GROQ)
        if not key_obj:
            raise Exception("No available Groq keys")
        
        try:
            # Update last used time
            key_obj.last_used = time.time()
            key_obj.calls_today += 1
            self.stats["groq_calls_today"] += 1
            self.stats["total_calls"] += 1
            
            # Make the call
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {key_obj.key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": max_tokens
                    }
                )
                
                if response.status_code == 429:
                    # Rate limited
                    key_obj.blocked_until = time.time() + 60
                    raise Exception(f"Rate limit exceeded: {response.text}")
                elif response.status_code != 200:
                    raise Exception(f"Groq API error {response.status_code}: {response.text}")
                
                content = response.json()["choices"][0]["message"]["content"].strip()
            
            # Reset failed attempts on success
            key_obj.failed_attempts = 0
            
            print(f"✅ Groq key {key_obj.index} successful ({len(content)} chars)")
            return content
            
        except Exception as e:
            key_obj.failed_attempts += 1
            error_msg = str(e).lower()
            
            if "rate limit" in error_msg or "429" in error_msg:
                key_obj.blocked_until = time.time() + 60
                print(f"⏱️ Groq key {key_obj.index} rate limited, blocked for 60s")
                raise Exception(f"Rate limit: {e}")
            else:
                print(f"❌ Groq key {key_obj.index} failed: {e}")
                raise Exception(f"Groq API error: {e}")

    async def call(self, prompt: str, max_tokens: int = 500, prefer: str = "gemini") -> str:
        """
        Main call method with automatic provider rotation
        
        Args:
            prompt: The prompt to send
            max_tokens: Maximum tokens to generate
            prefer: "gemini" or "groq" - which provider to try first
        
        Returns:
            Generated text or empty string if all fail
        """
        self._reset_daily_counts()
        
        providers = [Provider.GEMINI, Provider.GROQ] if prefer == "gemini" else [Provider.GROQ, Provider.GEMINI]
        
        for provider in providers:
            try:
                if provider == Provider.GEMINI:
                    return await self._call_gemini(prompt, max_tokens)
                else:
                    return await self._call_groq(prompt, max_tokens)
            except Exception as e:
                print(f"⚠️ {provider.value} failed, trying next provider: {e}")
                continue
        
        # All providers failed
        self.stats["failed_calls"] += 1
        print("❌ All providers failed")
        return ""

    def get_stats(self) -> Dict:
        """Get current statistics"""
        current_time = time.time()
        blocked_count = sum(1 for k in self.gemini_keys + self.groq_keys if current_time < k.blocked_until)
        
        return {
            "gemini_keys_loaded": len(self.gemini_keys),
            "groq_keys_loaded": len(self.groq_keys),
            "gemini_calls_today": self.stats["gemini_calls_today"],
            "groq_calls_today": self.stats["groq_calls_today"],
            "failed_calls": self.stats["failed_calls"],
            "blocked_keys_count": blocked_count,
            "total_calls": self.stats["total_calls"],
            "last_reset": self.stats["last_reset"]
        }

    def get_key_details(self) -> Dict:
        """Get detailed information about all keys"""
        current_time = time.time()
        details = {
            "gemini_keys": [],
            "groq_keys": []
        }
        
        for key_obj in self.gemini_keys:
            details["gemini_keys"].append({
                "index": key_obj.index,
                "calls_today": key_obj.calls_today,
                "failed_attempts": key_obj.failed_attempts,
                "blocked_until": datetime.fromtimestamp(key_obj.blocked_until).isoformat() if key_obj.blocked_until > current_time else None,
                "is_blocked": current_time < key_obj.blocked_until,
                "last_used": datetime.fromtimestamp(key_obj.last_used).isoformat() if key_obj.last_used > 0 else None
            })
        
        for key_obj in self.groq_keys:
            details["groq_keys"].append({
                "index": key_obj.index,
                "calls_today": key_obj.calls_today,
                "failed_attempts": key_obj.failed_attempts,
                "blocked_until": datetime.fromtimestamp(key_obj.blocked_until).isoformat() if key_obj.blocked_until > current_time else None,
                "is_blocked": current_time < key_obj.blocked_until,
                "last_used": datetime.fromtimestamp(key_obj.last_used).isoformat() if key_obj.last_used > 0 else None
            })
        
        return details

# Global instance
llm_rotator = LLMRotator()
