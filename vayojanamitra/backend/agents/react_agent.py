import time
import json
import hashlib
from datetime import datetime

# Static responses to save tokens
STATIC_RESPONSES = {
    "what is vayojanamitra": 
        "Vayojanamitra is a Kerala welfare scheme assistant for elderly citizens.",
    
    "helpline": 
        "• Elderline: 14567\n"
        "• Health: 104\n"
        "• Police: 100",
    
    "contact":
        "Call Elderline: 14567 (free, 24/7)",
    
    "thank you":
        "You're welcome! Feel free to ask anything.",
    
    "thanks":
        "Happy to help! Is there anything else?",
    
    "bye":
        "Goodbye! Take care. Call 14567 if you need help.",
    
    "ok":
        "Sure! What would you like to know about Kerala welfare schemes?",
}

# Response cache to avoid duplicate AI calls
class ResponseCache:
    def __init__(self):
        self.cache = {}  # in-memory cache
    
    def get_key(self, prompt: str) -> str:
        return hashlib.md5(prompt.encode()).hexdigest()[:16]
    
    def get(self, prompt: str):
        key = self.get_key(prompt)
        return self.cache.get(key)
    
    def set(self, prompt: str, response: str):
        key = self.get_key(prompt)
        self.cache[key] = response

cache = ResponseCache()
from agents.tools import TOOLS_REGISTRY, AgentTools
from db.mongo import get_db
from config import settings
import httpx
import os
from bson import ObjectId
from utils.llm_rotator import llm_rotator
from db.chroma import chroma_client
import json
import hashlib

class ReActAgent:
    
    MAX_STEPS = 5  # prevent infinite loops
    
    def __init__(self, user_id: str, session_id: str, db):
        self.user_id = user_id
        self.session_id = session_id
        self.db = db
        self.steps = []
        self.start_time = time.time()
        
        # Initialize tools
        self.tools = AgentTools(db)
    
    async def _call_ai(self, prompt: str, max_tokens: int = 400, prefer: str = "gemini") -> str:
        """Call AI API with automatic rotation - uses Gemini first, falls back to Groq"""
        
        # Check cache first (ZERO TOKENS if cached)
        cached = cache.get(prompt)
        if cached:
            print("📦 Cache hit — zero tokens used!")
            return cached
        
        # Call API
        response = await llm_rotator.call(prompt, max_tokens=max_tokens, prefer=prefer)
        
        # Cache the response
        cache.set(prompt, response)
        
        return response
    
    async def run(self, message: str) -> dict:
        """
        Enhanced agent with AI-powered intent detection and responses
        """
        try:
            # ── STATIC RESPONSES (ZERO TOKENS) ──
            msg_lower = message.strip().lower()
            for trigger, response in STATIC_RESPONSES.items():
                if trigger in msg_lower:
                    return {
                        "response": response,
                        "steps_taken": 0,
                        "scheme_cards": [],
                        "eligibility_result": None,
                        "agent_thoughts": ["Static response"]
                    }
            
            # Fetch user profile once at start
            try:
                user = await self.db.users.find_one({"_id": ObjectId(self.user_id)})
            except:
                # Fallback to string lookup if ObjectId conversion fails
                user = await self.db.users.find_one({"_id": self.user_id})
            if not user:
                user = {
                    "age": "Not specified",
                    "gender": "Not specified", 
                    "income_annual": "Not specified",
                    "location": "Not specified",
                    "occupation": "Not specified",
                    "health_conditions": []
                }
        
            # ── Quick reply for greetings ──
            greetings = ["hi", "hello", "hey", "good morning", "good evening", 
                         "good afternoon", "namaste", "hai", "helo", "vanakkam"]
            
            if message.strip().lower() in greetings:
                greeting_response = f"Hello! Welcome to Vayojanamitra 🌿\n\n• I can help you find pension, healthcare, and housing schemes\n• Based on your profile (Age: {user.get('age', 'N/A')}, Location: {user.get('location', 'N/A')}), I can guide you better\n• Just ask me anything!"
                
                return {
                    "response": greeting_response,
                    "steps_taken": 0,
                    "scheme_cards": [],
                    "eligibility_result": None,
                    "agent_thoughts": ["Greeting response"]
                }
            
            # ── AI-POWERED INTENT DETECTION (REDUCED PROMPT) ──
            intent_prompt = f"""Kerala welfare assistant. User: "{message}"
Profile: Age {user.get('age', 'N/A')}, {user.get('location', 'N/A')}
Return JSON only: {{"intent":"search|explain|howto|eligibility|offtopic","main_topic":"...","is_welfare_related":true}}"""
            
            intent_raw = await self._call_ai(intent_prompt)
            
            # Parse intent
            try:
                clean = intent_raw.strip()
                if "```" in clean:
                    clean = clean.split("```")[1]
                    if clean.startswith("json"):
                        clean = clean[4:]
                intent_data = json.loads(clean.strip())
            except Exception:
                intent_data = {
                    "intent": "search",
                    "main_topic": message,
                    "keywords": [message],
                    "is_welfare_related": True
                }
            
            main_topic = intent_data.get("main_topic", message)
            intent = intent_data.get("intent", "search")
            is_welfare = intent_data.get("is_welfare_related", True)
            
            # ── OFF-TOPIC HANDLER ──
            if not is_welfare:
                return {
                    "response": "I can only help with Kerala government welfare schemes and benefits.\n\n• Try asking about pension schemes\n• Healthcare benefits\n• Housing assistance\n• Disability support\n\nWhat welfare scheme would you like to know about?",
                    "steps_taken": 0,
                    "scheme_cards": [],
                    "eligibility_result": None,
                    "agent_thoughts": ["Off-topic question detected"]
                }
            
            # ── AI-POWERED RESPONSE GENERATION (REDUCED PROMPT) ──
            if intent in ["explain", "compare", "howto", "guidance"]:
                response_prompt = f"""Mitra helper. User: "{message}"
Profile: Age {user.get('age', 'N/A')}, {user.get('location', 'N/A')}
Topic: {main_topic}
Provide helpful response about {main_topic}. Use simple language and bullet points."""
                
                ai_response = await self._call_ai(response_prompt)
                
                return {
                    "response": ai_response,
                    "steps_taken": 1,
                    "scheme_cards": [],
                    "eligibility_result": None,
                    "agent_thoughts": [f"AI response for {intent} about {main_topic}"]
                }
            
            # ── SCHEME SEARCH (for search and eligibility intents) ──
            try:
                tools = AgentTools(self.db)
                schemes = await tools.search_schemes(main_topic)
                
                if schemes:
                    # Use AI to format the response
                    search_prompt = f"""
You are Mitra, helping elderly Kerala citizens.
User asked: "{message}"
User profile: Age {user.get('age', 'N/A')}, Location {user.get('location', 'N/A')}

Found these schemes in the database:
{json.dumps([{'title': s.get('title', ''), 'description': s.get('description', '')[:100]} for s in schemes[:5]], indent=2)}

Format a helpful response:
- Mention relevant schemes from the list above
- Keep it simple and clear
- Use • for bullets
- Add a helpful next step
- Don't make up schemes not in the list
"""
                    
                    ai_response = await self._call_ai(search_prompt)
                    
                    return {
                        "response": ai_response,
                        "steps_taken": 1,
                        "scheme_cards": schemes[:3],
                        "eligibility_result": None,
                        "agent_thoughts": ["AI-formatted search results"]
                    }
                else:
                    # No schemes found - use AI to provide helpful guidance
                    fallback_prompt = f"""
You are Mitra, helping elderly Kerala citizens.
User asked: "{message}"
User profile: Age {user.get('age', 'N/A')}, Location {user.get('location', 'N/A')}

I couldn't find schemes matching "{main_topic}" in my database.

Provide helpful guidance:
- Suggest alternative search terms
- Recommend general categories of schemes they might be interested in
- Provide contact information for local offices
- Be encouraging and helpful
"""
                    
                    ai_response = await self._call_ai(fallback_prompt)
                    
                    return {
                        "response": ai_response,
                        "steps_taken": 1,
                        "scheme_cards": [],
                        "eligibility_result": None,
                        "agent_thoughts": ["AI fallback guidance"]
                    }
                    
            except Exception as e:
                print(f"Search failed: {e}")
                return {
                    "response": "I'm having some technical difficulties searching for schemes right now. Please try again in a few moments or visit your nearest Kerala Social Security Mission office for immediate assistance.",
                    "steps_taken": 0,
                    "scheme_cards": [],
                    "eligibility_result": None,
                    "agent_thoughts": ["Technical difficulties - using fallback"]
                }
            
        except Exception as e:
            print(f"Critical error in agent: {e}")
            return {
                "response": "I'm experiencing technical difficulties right now. Please try again later or contact support for assistance.",
                "steps_taken": 0,
                "scheme_cards": [],
                "eligibility_result": None,
                "agent_thoughts": ["Critical error occurred"]
            }
