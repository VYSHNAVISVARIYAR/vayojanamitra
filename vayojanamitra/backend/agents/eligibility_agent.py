from typing import Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import httpx
from config import settings

class EligibilityAgent:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def check(self, scheme_id: str, user_id: str) -> Dict[str, Any]:
        """Check eligibility for a specific scheme for a user."""
        try:
            # Fetch user profile
            user = await self.db.users.find_one({"email": user_id})
            if not user:
                return {"error": "User not found"}
            
            # Fetch scheme
            scheme = await self.db.schemes.find_one({"_id": ObjectId(scheme_id)})
            if not scheme:
                return {"error": "Scheme not found"}
            
            # Extract relevant user profile fields
            user_profile = {
                "age": user.get("age"),
                "income_annual": user.get("income_annual"),
                "location": user.get("location"),
                "occupation": user.get("occupation"),
                "health_conditions": user.get("health_conditions", []),
                "gender": user.get("gender")
            }
            
            # Build detailed eligibility prompt
            prompt = f"""
System: You are an eligibility checker for Kerala government welfare schemes.
Be precise and compassionate. The user is an elderly citizen.

User Profile:
- Age: {user_profile.get('age', 'Not specified')}
- Annual Income: Rs {user_profile.get('income_annual', 'Not specified')}
- Location: {user_profile.get('location', 'Not specified')} Kerala
- Occupation: {user_profile.get('occupation', 'Not specified')}
- Health Conditions: {', '.join(user_profile.get('health_conditions', []))}
- Gender: {user_profile.get('gender', 'Not specified')}

Scheme: {scheme.get('title', 'Unknown')}
Eligibility Criteria: {scheme.get('eligibility', 'Not specified')}

Analyze carefully and return ONLY this JSON:
{{
  "result": "Eligible" | "Possibly Eligible" | "Not Eligible",
  "confidence": 0-100,
  "reason": "clear explanation in simple English",
  "matching_criteria": ["criteria user meets"],
  "missing_criteria": ["criteria user doesn't meet"],
  "next_steps": "what user should do next"
}}
"""
            
            from utils.llm import call_llm
            content = await call_llm(prompt, max_tokens=1000)
            
            if not content:
                raise Exception("LLM returned empty response")
            
            # Parse JSON response
            import json
            try:
                eligibility_result = json.loads(content)
                
                # Add scheme information
                eligibility_result["scheme"] = {
                    "id": scheme_id,
                    "title": scheme.get("title", ""),
                    "category": scheme.get("category", "")
                }
                
                return eligibility_result
                
            except json.JSONDecodeError as e:
                print(f"JSON parse error: {e}")
                return {"error": "Failed to parse eligibility result"}
                
        except Exception as e:
            print(f"Error in eligibility check: {e}")
            return {"error": "Eligibility check failed"}
