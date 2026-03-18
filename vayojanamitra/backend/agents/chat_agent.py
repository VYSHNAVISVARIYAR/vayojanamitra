from typing import Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorDatabase
import httpx
import json
from config import settings
from .memory import ConversationMemory
from .tools import AgentTools

class ChatAgent:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.tools = AgentTools(db)

    async def process(self, message: str, user_id: str, session_id: str) -> Dict[str, Any]:
        """Process a user message and generate response."""
        
        # Initialize conversation memory
        memory = ConversationMemory(user_id, session_id, self.db)
        
        # Get user profile
        user = await self.db.users.find_one({"email": user_id})
        user_profile = user if user else {}
        
        # Get conversation context
        context_summary = await memory.get_context_summary()
        
        # STEP A - Detect Intent
        intent_result = await self._detect_intent(message, context_summary)
        
        # STEP B - Execute tool based on intent
        tool_results = {}
        scheme_cards = []
        eligibility_result = None
        
        if intent_result["intent"] == "scheme_search":
            search_results = await self.tools.search_schemes(intent_result.get("extracted_query", message))
            tool_results["search_results"] = search_results
            scheme_cards = search_results[:3]  # Show top 3 as cards
            
        elif intent_result["intent"] == "eligibility_check":
            scheme_name = intent_result.get("scheme_name")
            if scheme_name:
                # Find scheme by name
                scheme = await self.db.schemes.find_one({"title": {"$regex": scheme_name, "$options": "i"}})
                if scheme:
                    eligibility_result = await self.tools.check_eligibility(str(scheme["_id"]), user_profile)
                    tool_results["eligibility"] = eligibility_result
                    
        elif intent_result["intent"] == "scheme_detail":
            scheme_name = intent_result.get("scheme_name")
            if scheme_name:
                scheme = await self.db.schemes.find_one({"title": {"$regex": scheme_name, "$options": "i"}})
                if scheme:
                    scheme_details = await self.tools.get_scheme_details(str(scheme["_id"]))
                    tool_results["scheme_details"] = scheme_details
                    scheme_cards = [scheme_details]
                    
        elif intent_result["intent"] == "navigation":
            # Handle navigation requests
            tool_results["navigation"] = self._handle_navigation(intent_result.get("extracted_query", ""))
            
        # STEP C - Generate final response
        response = await self._generate_response(
            message, context_summary, user_profile, tool_results, intent_result["intent"]
        )
        
        # STEP D - Save to memory and return response
        await memory.add_message("user", message, intent_result["intent"])
        await memory.add_message("assistant", response, intent_result["intent"], 
                              [card["id"] for card in scheme_cards] if scheme_cards else [])
        
        return {
            "response": response,
            "intent": intent_result["intent"],
            "scheme_cards": scheme_cards,
            "eligibility_result": eligibility_result,
            "session_id": session_id
        }

    async def _detect_intent(self, message: str, context: str) -> Dict[str, str]:
        """Detect user intent using OpenRouter API."""
        try:
            prompt = f"""
Classify this user message into one intent:
- scheme_search: user wants to find schemes
- eligibility_check: user wants to check if they qualify  
- scheme_detail: user asking about a specific scheme
- navigation: user wants to go to a page/feature
- general: general question about welfare/government

Message: "{message}"

Return ONLY JSON: {{"intent": "...", "extracted_query": "...", "scheme_name": "..."}}
"""
            
            from utils.llm import call_llm
            content = await call_llm(prompt, max_tokens=1000)
            
            if not content:
                return {"intent": "general", "extracted_query": message, "scheme_name": ""}
            
            # Parse JSON response
            try:
                intent_result = json.loads(content)
                return intent_result
            except json.JSONDecodeError:
                # Fallback to general intent
                return {"intent": "general", "extracted_query": message, "scheme_name": ""}
                
        except Exception as e:
            print(f"Error detecting intent: {e}")
            return {"intent": "general", "extracted_query": message, "scheme_name": ""}

    def _handle_navigation(self, query: str) -> Dict[str, str]:
        """Handle navigation requests."""
        query_lower = query.lower()
        
        if "profile" in query_lower:
            return {"destination": "profile", "message": "I'll take you to your profile page."}
        elif "recommendation" in query_lower or "recommend" in query_lower:
            return {"destination": "recommendations", "message": "Let me show you personalized recommendations."}
        elif "scheme" in query_lower and "search" in query_lower:
            return {"destination": "schemes", "message": "I'll take you to the scheme explorer."}
        elif "bookmark" in query_lower:
            return {"destination": "bookmarks", "message": "Let me show you your bookmarked schemes."}
        else:
            return {"destination": "home", "message": "I'll take you to the home page."}

    async def _generate_response(self, message: str, context: str, user_profile: Dict, 
                                 tool_results: Dict, intent: str) -> str:
        """Generate final response using OpenRouter API."""
        try:
            # Build user profile summary
            profile_summary = self._build_profile_summary(user_profile)
            
            # Build tool results summary
            tool_summary = self._build_tool_summary(tool_results)
            
            prompt = f"""
System: You are Mitra, a helpful AI assistant for Vayojanamitra.ai — 
a welfare scheme platform for elderly citizens of Kerala.
Speak simply, warmly, and clearly. 
If the user seems to prefer Malayalam, mix in simple Malayalam words.
Never use jargon. Always be encouraging.

Conversation so far:
{context}

User profile: {profile_summary}

Tool results: {tool_summary}

User message: {message}

Respond helpfully. If showing schemes, mention 2-3 key details only.
If eligibility result is available, explain it simply and give next steps.
Keep your response concise and friendly.
"""
            
            from utils.llm import call_llm
            content = await call_llm(prompt, max_tokens=1000)
            
            if not content:
                return "I'm sorry, I'm having trouble understanding. Could you please try again?"
                
            return content
                
        except Exception as e:
            print(f"Error generating response: {e}")
            return "I'm sorry, I'm having trouble understanding. Could you please try again?"

    def _build_profile_summary(self, user_profile: Dict) -> str:
        """Build a summary of user profile."""
        parts = []
        
        if user_profile.get("age"):
            parts.append(f"Age: {user_profile['age']}")
        if user_profile.get("location"):
            parts.append(f"Location: {user_profile['location']}")
        if user_profile.get("occupation"):
            parts.append(f"Occupation: {user_profile['occupation']}")
        if user_profile.get("income_annual"):
            parts.append(f"Income: Rs {user_profile['income_annual']}")
        if user_profile.get("health_conditions"):
            parts.append(f"Health: {', '.join(user_profile['health_conditions'])}")
            
        return ", ".join(parts) if parts else "Profile not completed"

    def _build_tool_summary(self, tool_results: Dict) -> str:
        """Build a summary of tool results."""
        summaries = []
        
        if "search_results" in tool_results:
            schemes = tool_results["search_results"]
            summaries.append(f"Found {len(schemes)} schemes")
            
        if "eligibility" in tool_results:
            eligibility = tool_results["eligibility"]
            if "result" in eligibility:
                summaries.append(f"Eligibility: {eligibility['result']}")
                
        if "scheme_details" in tool_results:
            summaries.append("Scheme details retrieved")
            
        if "navigation" in tool_results:
            nav = tool_results["navigation"]
            summaries.append(f"Navigation: {nav.get('destination', '')}")
            
        return ". ".join(summaries) if summaries else "No additional information"
