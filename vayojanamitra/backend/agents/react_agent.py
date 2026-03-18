import time
import json
import re
from datetime import datetime
from agents.tools import TOOLS_REGISTRY, AgentTools
from db.mongo import get_db
from config import settings
import httpx
import os
from bson import ObjectId

class ReActAgent:
    
    MAX_STEPS = 5  # prevent infinite loops
    
    def __init__(self, user_id: str, session_id: str, db):
        self.user_id = user_id
        self.session_id = session_id
        self.db = db
        self.steps = []
        self.start_time = time.time()
    
    async def run(self, message: str) -> dict:
        """
        Simplified agent that directly searches schemes without complex ReAct loop
        """
        try:
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
                         "good afternoon", "namaste", "hai", "helo"]
            
            if message.strip().lower() in greetings:
                greeting_response = f"Hello! Welcome to Vayojanamitra 🌿\n\n• I can help you find pension, healthcare, and housing schemes\n• Based on your profile (Age: {user.get('age', 'N/A')}, Location: {user.get('location', 'N/A')}), I can guide you better\n• Just ask me anything!"
                
                return {
                    "response": greeting_response,
                    "steps_taken": 0,
                    "scheme_cards": [],
                    "eligibility_result": None,
                    "agent_thoughts": ["Greeting response"]
                }
            
            # ── DIRECT SCHEME SEARCH ──
            try:
                tools = AgentTools(self.db)
                schemes = await tools.search_schemes(message)
                
                if schemes:
                    # Format response with found schemes
                    query_lower = message.lower()
                    
                    # Customize response based on query type
                    if "pension" in query_lower and "farmer" in query_lower:
                        response = f"I found {len(schemes)} pension schemes specifically for farmers:\n\n"
                    elif "pension" in query_lower:
                        response = f"I found {len(schemes)} pension schemes for you:\n\n"
                    elif "farmer" in query_lower or "agriculture" in query_lower:
                        response = f"I found {len(schemes)} schemes for farmers:\n\n"
                    else:
                        response = f"I found {len(schemes)} relevant schemes for you:\n\n"
                    
                    for i, scheme in enumerate(schemes[:5], 1):
                        title = scheme.get('title', 'No title')
                        description = scheme.get('description', 'No description available')
                        # Truncate description if too long
                        if len(description) > 200:
                            description = description[:200] + "..."
                        response += f"{i}. **{title}**\n   {description}\n\n"
                    
                    # Add contextual follow-up
                    if "pension" in query_lower and "farmer" in query_lower:
                        response += f"Based on your profile (Age: {user.get('age', 'N/A')}, Location: {user.get('location', 'N/A')}), these farmer pension schemes may be suitable for you. Would you like me to check your eligibility for any specific scheme?"
                    elif "pension" in query_lower:
                        response += f"Based on your profile (Age: {user.get('age', 'N/A')}, Location: {user.get('location', 'N/A')}), these pension schemes may be suitable for you. Would you like me to check your eligibility for any specific scheme?"
                    else:
                        response += f"Based on your profile (Age: {user.get('age', 'N/A')}, Location: {user.get('location', 'N/A')}), these schemes may be suitable for you. Would you like me to check your eligibility for any specific scheme?"
                    
                    return {
                        "response": response,
                        "steps_taken": 1,
                        "scheme_cards": schemes,
                        "eligibility_result": None,
                        "agent_thoughts": ["Direct search completed"]
                    }
                else:
                    # Fallback to recent schemes if no search results
                    query_lower = message.lower()
                    
                    if "pension" in query_lower and "farmer" in query_lower:
                        # Try separate searches for pension and farmer schemes
                        pension_schemes = await tools.search_schemes("pension schemes")
                        farmer_schemes = await tools.search_schemes("farmer schemes")
                        
                        all_schemes = []
                        if pension_schemes:
                            all_schemes.extend(pension_schemes[:2])
                        if farmer_schemes:
                            all_schemes.extend(farmer_schemes[:2])
                        
                        if all_schemes:
                            response = f"I couldn't find schemes that are specifically both pension AND for farmers, but here are some relevant options:\n\n"
                            response += "**Pension Schemes:**\n"
                            for scheme in pension_schemes[:2]:
                                title = scheme.get('title', 'No title')
                                response += f"• {title}\n"
                            
                            response += "\n**Farmer Schemes:**\n"
                            for scheme in farmer_schemes[:2]:
                                title = scheme.get('title', 'No title')
                                response += f"• {title}\n"
                                
                            response += f"\nBased on your profile (Age: {user.get('age', 'N/A')}, Location: {user.get('location', 'N/A')}), you may be eligible for these schemes. Would you like me to check your eligibility for any specific scheme?"
                        else:
                            response = f"I couldn't find specific pension schemes for farmers. Based on your profile (Age: {user.get('age', 'N/A')}, Location: {user.get('location', 'N/A')}), you may be eligible for various government schemes. Please try asking about 'pension schemes' or 'farmer schemes' separately for more specific results."
                    else:
                        recent_schemes = await tools.search_schemes("pension")  # Try pension as fallback
                        if recent_schemes:
                            response = f"I couldn't find exact matches for '{message}', but here are some popular pension schemes you might be interested in:\n\n"
                            for i, scheme in enumerate(recent_schemes[:3], 1):
                                title = scheme.get('title', 'No title')
                                response += f"{i}. {title}\n"
                            response += f"\nBased on your profile (Age: {user.get('age', 'N/A')}, Location: {user.get('location', 'N/A')}), you may be eligible for these schemes. Would you like more details?"
                        else:
                            response = f"I searched for schemes related to '{message}' but couldn't find any matches. Based on your profile (Age: {user.get('age', 'N/A')}, Location: {user.get('location', 'N/A')}), you may be eligible for various government schemes. Please try asking about 'pension schemes' or 'healthcare benefits' for more specific results."
                    
                    return {
                        "response": response,
                        "steps_taken": 1,
                        "scheme_cards": all_schemes[:4] if all_schemes else [],
                        "eligibility_result": None,
                        "agent_thoughts": ["Fallback search completed"]
                    }
                    
            except Exception as e:
                print(f"Search failed: {e}")
                return {
                    "response": f"I'm having some technical difficulties searching for schemes right now. However, based on your profile (Age: {user.get('age', 'N/A')}, Location: {user.get('location', 'N/A')}), you may be eligible for various government welfare schemes. Please try again in a few moments or visit your nearest Kerala Social Security Mission office for immediate assistance.",
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
