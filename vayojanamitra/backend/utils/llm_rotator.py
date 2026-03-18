"""
utils/llm_rotator.py

Automatically rotates between:
- 3 Gemini keys  (1M tokens/day each = 3M total)
- 3 Groq keys    (1M tokens/day each = 3M total)
- 3 OpenRouter keys (free tier backup)
─────────────────────────────────────────
GRAND TOTAL: 6M+ tokens/day FREE

Priority order:
1. Gemini     (best Kerala/India knowledge)
2. Groq       (fastest response)
3. OpenRouter (backup when others fail)
"""

import os
import httpx
import itertools
import asyncio
from dotenv import load_dotenv

load_dotenv()


class RateLimitError(Exception):
    pass


class LLMRotator:
    """
    Rotates between 3 Gemini + 3 Groq + 3 OpenRouter keys.

    Usage anywhere in your app:
        from utils.llm_rotator import llm_rotator
        response = await llm_rotator.call("your prompt")
    """

    def __init__(self):

        # ── Load Gemini Keys ───────────────────────
        self.gemini_keys = [
            os.getenv("GEMINI_API_KEY_1"),
            os.getenv("GEMINI_API_KEY_2"),
            os.getenv("GEMINI_API_KEY_3"),
        ]
        self.gemini_keys = [
            k for k in self.gemini_keys if k
        ]

        # ── Load Groq Keys ─────────────────────────
        self.groq_keys = [
            os.getenv("GROQ_API_KEY_1"),
            os.getenv("GROQ_API_KEY_2"),
            os.getenv("GROQ_API_KEY_3"),
        ]
        self.groq_keys = [
            k for k in self.groq_keys if k
        ]

        # ── Load OpenRouter Keys ───────────────────
        self.openrouter_keys = [
            os.getenv("OPENROUTER_API_KEY_1"),
            os.getenv("OPENROUTER_API_KEY_2"),
            os.getenv("OPENROUTER_API_KEY_3"),
        ]
        self.openrouter_keys = [
            k for k in self.openrouter_keys if k
        ]

        # ── Create Rotation Cycles ─────────────────
        self.gemini_cycle = itertools.cycle(
            self.gemini_keys
        ) if self.gemini_keys else None

        self.groq_cycle = itertools.cycle(
            self.groq_keys
        ) if self.groq_keys else None

        self.openrouter_cycle = itertools.cycle(
            self.openrouter_keys
        ) if self.openrouter_keys else None

        # Keys temporarily blocked due to rate limit
        self.blocked_keys = set()

        # Usage stats
        self.stats = {
            "gemini_calls": 0,
            "groq_calls": 0,
            "openrouter_calls": 0,
            "failed_calls": 0,
        }

        # Print summary on startup
        print(
            f"\n🔑 LLMRotator initialized:"
            f"\n   Gemini keys:     {len(self.gemini_keys)}"
            f"\n   Groq keys:       {len(self.groq_keys)}"
            f"\n   OpenRouter keys: "
            f"{len(self.openrouter_keys)}"
            f"\n   Total keys:      "
            f"{len(self.gemini_keys) + len(self.groq_keys) + len(self.openrouter_keys)}"
            f"\n   Est. tokens/day: "
            f"{(len(self.gemini_keys) + len(self.groq_keys)) * 1_000_000:,}"
            f"\n"
        )

    # ──────────────────────────────────────────────
    # PUBLIC METHOD — use this everywhere in app
    # ──────────────────────────────────────────────
    async def call(
        self,
        prompt: str,
        max_tokens: int = 500,
        prefer: str = "gemini"
    ) -> str:
        """
        Call LLM with automatic key rotation + fallback.

        Args:
            prompt:     The prompt to send
            max_tokens: Maximum response tokens
            prefer:     "gemini" | "groq" | "openrouter"

        Returns:
            str: AI response or "" if all fail
        """

        # Define provider order based on preference
        if prefer == "gemini":
            order = ["gemini", "groq", "openrouter"]
        elif prefer == "groq":
            order = ["groq", "gemini", "openrouter"]
        elif prefer == "openrouter":
            order = ["openrouter", "gemini", "groq"]
        else:
            order = ["gemini", "groq", "openrouter"]

        # Try each provider in order
        for provider in order:
            result = await self._try_provider(
                provider, prompt, max_tokens
            )
            if result:
                return result

        # All providers failed
        self.stats["failed_calls"] += 1
        print(
            f"❌ All providers failed. "
            f"Total failures: {self.stats['failed_calls']}"
        )
        return ""

    # ──────────────────────────────────────────────
    # PROVIDER ROUTER
    # ──────────────────────────────────────────────
    async def _try_provider(
        self,
        provider: str,
        prompt: str,
        max_tokens: int
    ) -> str:
        if provider == "gemini":
            return await self._try_all_gemini(
                prompt, max_tokens
            )
        elif provider == "groq":
            return await self._try_all_groq(
                prompt, max_tokens
            )
        elif provider == "openrouter":
            return await self._try_all_openrouter(
                prompt, max_tokens
            )
        return ""

    # ──────────────────────────────────────────────
    # GEMINI — try all 3 keys
    # ──────────────────────────────────────────────
    async def _try_all_gemini(
        self, prompt: str, max_tokens: int
    ) -> str:
        if not self.gemini_keys:
            return ""

        for _ in range(len(self.gemini_keys)):
            key = next(self.gemini_cycle)
            if key in self.blocked_keys:
                continue
            try:
                result = await self._call_gemini(
                    prompt, key, max_tokens
                )
                self.stats["gemini_calls"] += 1
                print(f"✅ Gemini (key ...{key[-6:]})")
                return result
            except RateLimitError:
                print(
                    f"⚠️ Gemini rate limited "
                    f"(key ...{key[-6:]})"
                )
                self._block_key(key, seconds=60)
                continue
            except Exception as e:
                print(f"❌ Gemini error: {e}")
                continue

        print("⚠️ All Gemini keys failed/rate limited")
        return ""

    # ──────────────────────────────────────────────
    # GROQ — try all 3 keys
    # ──────────────────────────────────────────────
    async def _try_all_groq(
        self, prompt: str, max_tokens: int
    ) -> str:
        if not self.groq_keys:
            return ""

        for _ in range(len(self.groq_keys)):
            key = next(self.groq_cycle)
            if key in self.blocked_keys:
                continue
            try:
                result = await self._call_groq(
                    prompt, key, max_tokens
                )
                self.stats["groq_calls"] += 1
                print(f"✅ Groq (key ...{key[-6:]})")
                return result
            except RateLimitError:
                print(
                    f"⚠️ Groq rate limited "
                    f"(key ...{key[-6:]})"
                )
                self._block_key(key, seconds=60)
                continue
            except Exception as e:
                print(f"❌ Groq error: {e}")
                continue

        print("⚠️ All Groq keys failed/rate limited")
        return ""

    # ──────────────────────────────────────────────
    # OPENROUTER — try all 3 keys
    # ──────────────────────────────────────────────
    async def _try_all_openrouter(
        self, prompt: str, max_tokens: int
    ) -> str:
        if not self.openrouter_keys:
            return ""

        for _ in range(len(self.openrouter_keys)):
            key = next(self.openrouter_cycle)
            if key in self.blocked_keys:
                continue
            try:
                result = await self._call_openrouter(
                    prompt, key, max_tokens
                )
                self.stats["openrouter_calls"] += 1
                print(
                    f"✅ OpenRouter (key ...{key[-6:]})"
                )
                return result
            except RateLimitError:
                print(
                    f"⚠️ OpenRouter rate limited "
                    f"(key ...{key[-6:]})"
                )
                # OpenRouter daily limit — block 1 hour
                self._block_key(key, seconds=3600)
                continue
            except Exception as e:
                print(f"❌ OpenRouter error: {e}")
                continue

        print("⚠️ All OpenRouter keys failed/rate limited")
        return ""

    # ──────────────────────────────────────────────
    # API CALLERS
    # ──────────────────────────────────────────────
    async def _call_gemini(
        self,
        prompt: str,
        api_key: str,
        max_tokens: int
    ) -> str:
        """Call Google Gemini 2.0 Flash"""
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://generativelanguage.googleapis.com"
                "/v1beta/models/gemini-2.0-flash"
                f":generateContent?key={api_key}",
                headers={
                    "Content-Type": "application/json"
                },
                json={
                    "contents": [
                        {
                            "parts": [{"text": prompt}]
                        }
                    ],
                    "generationConfig": {
                        "maxOutputTokens": max_tokens,
                        "temperature": 0.3
                    }
                }
            )
            if response.status_code == 429:
                raise RateLimitError("Gemini rate limited")
            if response.status_code != 200:
                raise Exception(
                    f"Gemini HTTP {response.status_code}"
                )
            data = response.json()
            return (
                data["candidates"][0]
                ["content"]["parts"][0]["text"]
                .strip()
            )

    async def _call_groq(
        self,
        prompt: str,
        api_key: str,
        max_tokens: int
    ) -> str:
        """Call Groq Llama"""
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.groq.com"
                "/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": max_tokens,
                    "temperature": 0.3
                }
            )
            if response.status_code == 429:
                raise RateLimitError("Groq rate limited")
            if response.status_code != 200:
                raise Exception(
                    f"Groq HTTP {response.status_code}"
                )
            return (
                response.json()
                ["choices"][0]["message"]["content"]
                .strip()
            )

    async def _call_openrouter(
        self,
        prompt: str,
        api_key: str,
        max_tokens: int
    ) -> str:
        """Call OpenRouter"""
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://openrouter.ai"
                "/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:8000",
                    "X-Title": "Vayojanamitra"
                },
                json={
                    "model": "openrouter/auto",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": max_tokens
                }
            )
            # 402 = credits exhausted
            if response.status_code in [402, 429]:
                raise RateLimitError(
                    "OpenRouter limit reached"
                )
            if response.status_code != 200:
                raise Exception(
                    f"OpenRouter HTTP {response.status_code}"
                )
            return (
                response.json()
                ["choices"][0]["message"]["content"]
                .strip()
            )

    # ──────────────────────────────────────────────
    # HELPER METHODS
    # ──────────────────────────────────────────────
    def _block_key(self, key: str, seconds: int = 60):
        """Temporarily block a rate-limited key"""
        self.blocked_keys.add(key)
        try:
            loop = asyncio.get_event_loop()
            loop.call_later(
                seconds,
                lambda k=key: self.blocked_keys.discard(k)
            )
        except Exception:
            pass
        print(
            f"🔒 Key ...{key[-6:]} blocked "
            f"for {seconds}s"
        )

    def get_stats(self) -> dict:
        """Returns current usage statistics"""
        total = (
            self.stats["gemini_calls"] +
            self.stats["groq_calls"] +
            self.stats["openrouter_calls"]
        )
        return {
            "keys_loaded": {
                "gemini": len(self.gemini_keys),
                "groq": len(self.groq_keys),
                "openrouter": len(self.openrouter_keys),
                "total": (
                    len(self.gemini_keys) +
                    len(self.groq_keys) +
                    len(self.openrouter_keys)
                )
            },
            "calls_today": {
                "gemini": self.stats["gemini_calls"],
                "groq": self.stats["groq_calls"],
                "openrouter": self.stats["openrouter_calls"],
                "failed": self.stats["failed_calls"],
                "total": total
            },
            "blocked_keys": len(self.blocked_keys),
            "tokens_per_day_estimate": {
                "gemini": (
                    len(self.gemini_keys) * 1_000_000
                ),
                "groq": (
                    len(self.groq_keys) * 1_000_000
                ),
                "openrouter": "varies (free tier)",
                "total_guaranteed": (
                    (len(self.gemini_keys) +
                     len(self.groq_keys)) * 1_000_000
                )
            }
        }


# ── Global singleton ───────────────────────────────────
# Import this ONE instance everywhere in your app:
# from utils.llm_rotator import llm_rotator
llm_rotator = LLMRotator()
