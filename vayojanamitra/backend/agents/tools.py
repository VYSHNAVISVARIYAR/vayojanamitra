from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import httpx
from datetime import datetime, timedelta
from db.chroma import chroma_client
from config import settings

class AgentTools:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def search_schemes(self, query: str) -> List[Dict[str, Any]]:
        """Search schemes using ChromaDB similarity search with enhanced filtering."""
        try:
            # Enhanced query for better specificity
            enhanced_query = query
            
            # Add specific keywords for common queries
            if "pension" in query.lower() and "farmer" in query.lower():
                enhanced_query = "pension scheme agriculture farmer kerala agricultural pension"
            elif "pension" in query.lower():
                enhanced_query = "pension scheme retirement senior citizen elderly welfare"
            elif "farmer" in query.lower() or "agriculture" in query.lower():
                enhanced_query = "agriculture farmer farming kerala agricultural scheme"
            elif "healthcare" in query.lower() or "medical" in query.lower():
                enhanced_query = "healthcare medical hospital treatment health scheme"
            elif "housing" in query.lower() or "house" in query.lower():
                enhanced_query = "housing house construction home building scheme"
            elif "education" in query.lower() or "scholarship" in query.lower():
                enhanced_query = "education scholarship student school college scheme"
            
            print(f"🔍 Enhanced query: '{enhanced_query}' (original: '{query}')")
            
            # Run ChromaDB similarity search with enhanced query
            similar_schemes = await chroma_client.similarity_search(enhanced_query, n=8)
            scheme_ids = [ObjectId(result["mongo_id"]) for result in similar_schemes if result.get("mongo_id")]
            
            if not scheme_ids:
                # Enhanced fallback: search MongoDB directly with better filtering
                print("⚠️ ChromaDB not working, using enhanced MongoDB search")
                
                # Build MongoDB query based on search terms
                query_lower = query.lower()
                mongo_query = {}
                
                if "pension" in query_lower and "farmer" in query_lower:
                    # Look for pension schemes OR farmer schemes (since exact match might not exist)
                    pension_query = {
                        "$or": [
                            {"title": {"$regex": "pension", "$options": "i"}},
                            {"description": {"$regex": "pension", "$options": "i"}},
                            {"category": {"$regex": "pension", "$options": "i"}}
                        ]
                    }
                    farmer_query = {
                        "$or": [
                            {"title": {"$regex": "(farmer|agricultur|farm|kisan|cultivat)", "$options": "i"}},
                            {"description": {"$regex": "(farmer|agricultur|farm|kisan|cultivat)", "$options": "i"}},
                            {"category": {"$regex": "(farmer|agricultur|farm|kisan|cultivat)", "$options": "i"}}
                        ]
                    }
                    
                    # Get both pension and farmer schemes
                    pension_schemes = await self.db.schemes.find(pension_query).limit(3).to_list(50)
                    farmer_schemes = await self.db.schemes.find(farmer_query).limit(3).to_list(50)
                    
                    # Combine and deduplicate
                    all_schemes = pension_schemes + farmer_schemes
                    seen_ids = set()
                    schemes = []
                    for scheme in all_schemes:
                        if scheme["_id"] not in seen_ids:
                            schemes.append(scheme)
                            seen_ids.add(scheme["_id"])
                    
                    schemes = schemes[:5]  # Limit to top 5
                    print(f"🎯 MongoDB combined search: {len(pension_schemes)} pension + {len(farmer_schemes)} farmer schemes")
                    
                elif "pension" in query_lower:
                    # Look for pension schemes
                    mongo_query = {
                        "$or": [
                            {"title": {"$regex": "pension", "$options": "i"}},
                            {"description": {"$regex": "pension", "$options": "i"}},
                            {"category": {"$regex": "pension", "$options": "i"}}
                        ]
                    }
                    schemes = await self.db.schemes.find(mongo_query).limit(5).to_list(50)
                    print(f"🎯 MongoDB search for pension schemes")
                    
                elif "farmer" in query_lower or "agriculture" in query_lower:
                    # Look for farmer schemes
                    mongo_query = {
                        "$or": [
                            {"title": {"$regex": "(farmer|agricultur|farm|kisan|cultivat)", "$options": "i"}},
                            {"description": {"$regex": "(farmer|agricultur|farm|kisan|cultivat)", "$options": "i"}},
                            {"category": {"$regex": "(farmer|agricultur|farm|kisan|cultivat)", "$options": "i"}}
                        ]
                    }
                    schemes = await self.db.schemes.find(mongo_query).limit(5).to_list(50)
                    print(f"🎯 MongoDB search for farmer schemes")
                    
                elif "housing" in query_lower or "house" in query_lower:
                    # Look for housing schemes
                    mongo_query = {
                        "$or": [
                            {"title": {"$regex": "(housing|house|home|construction|building|shelter|pmay|housing scheme)", "$options": "i"}},
                            {"description": {"$regex": "(housing|house|home|construction|building|shelter|pmay|housing scheme)", "$options": "i"}},
                            {"category": {"$regex": "(housing|house|home|construction|building|shelter|pmay|housing scheme)", "$options": "i"}}
                        ]
                    }
                    schemes = await self.db.schemes.find(mongo_query).limit(5).to_list(50)
                    print(f"🎯 MongoDB search for housing schemes")
                    
                else:
                    # Generic search - get recent schemes
                    schemes = await self.db.schemes.find().sort("created_at", -1).limit(5).to_list(50)
                    print("⚠️ Using fallback: recent schemes")
            else:
                # Fetch full scheme details from MongoDB
                schemes = await self.db.schemes.find({"_id": {"$in": scheme_ids}}).to_list(50)
                print(f"✅ Found {len(schemes)} schemes from ChromaDB")
            
            # Additional filtering for better relevance
            if "pension" in query.lower() and "farmer" in query.lower():
                # Filter for pension schemes specifically
                filtered_schemes = []
                for scheme in schemes:
                    title = scheme.get("title", "")
                    description = scheme.get("description", "")
                    category = scheme.get("category", "")
                    
                    # Ensure scheme data is a string
                    if isinstance(title, list):
                        title = " ".join(title) if title else ""
                    if isinstance(description, list):
                        description = " ".join(description) if description else ""
                    if isinstance(category, list):
                        category = " ".join(category) if category else ""
                    
                    title_lower = str(title).lower()
                    desc_lower = str(description).lower()
                    category_lower = str(category).lower()
                    
                    # Must contain pension and either farmer/agriculture terms
                    if ("pension" in title_lower or "pension" in desc_lower) and \
                       ("farmer" in title_lower or "agricultur" in title_lower or "farm" in title_lower or "cultivat" in title_lower or "kisan" in title_lower):
                        filtered_schemes.append(scheme)
                
                if filtered_schemes:
                    schemes = filtered_schemes[:5]  # Limit to top 5 relevant results
                    print(f"🎯 Filtered to {len(schemes)} pension schemes for farmers")
            
            # Convert ObjectId to string and format for response
            formatted_schemes = []
            for scheme in schemes:
                scheme["_id"] = str(scheme["_id"])
                formatted_schemes.append({
                    "id": scheme["_id"],
                    "title": scheme.get("title", ""),
                    "description": scheme.get("description", ""),
                    "benefits": scheme.get("benefits", ""),
                    "category": scheme.get("category", ""),
                    "source_url": scheme.get("source_url", "")
                })
            
            return formatted_schemes
            
        except Exception as e:
            print(f"Error searching schemes: {e}")
            return []

    async def check_eligibility(self, scheme_id: str, user_profile: Dict[str, Any]) -> Dict[str, Any]:
        """Check if user is eligible for a specific scheme."""
        try:
            # Fetch scheme from MongoDB
            scheme = await self.db.schemes.find_one({"_id": ObjectId(scheme_id)})
            if not scheme:
                return {"error": "Scheme not found"}
            
            # Build eligibility prompt
            prompt = f"""
You are an eligibility checker for Kerala government welfare schemes.
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
                return eligibility_result
            except json.JSONDecodeError:
                return {"error": "Failed to parse eligibility result"}
                
        except Exception as e:
            print(f"Error checking eligibility: {e}")
            return {"error": "Eligibility check failed"}

    async def get_scheme_details(self, scheme_id: str) -> Dict[str, Any]:
        """Fetch full scheme details from MongoDB."""
        try:
            scheme = await self.db.schemes.find_one({"_id": ObjectId(scheme_id)})
            if not scheme:
                return {"error": "Scheme not found"}
            
            # Convert ObjectId to string
            scheme["_id"] = str(scheme["_id"])
            return scheme
            
        except Exception as e:
            print(f"Error getting scheme details: {e}")
            return {"error": "Failed to get scheme details"}

    async def get_recommendations(self, user_profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get personalized recommendations for the user."""
        try:
            # Build natural language query from profile
            profile_parts = []
            if user_profile.get("age"):
                profile_parts.append(f"age {user_profile['age']}")
            if user_profile.get("location"):
                profile_parts.append(f"from {user_profile['location']}")
            if user_profile.get("occupation"):
                profile_parts.append(user_profile["occupation"].lower())
            if user_profile.get("income_annual"):
                if user_profile["income_annual"] < settings.BPL_THRESHOLD:
                    profile_parts.append("low income")
                elif user_profile["income_annual"] < settings.MIDDLE_INCOME_THRESHOLD:
                    profile_parts.append("middle income")
                else:
                    profile_parts.append("higher income")
            if user_profile.get("health_conditions"):
                health_text = ", ".join(user_profile["health_conditions"])
                profile_parts.append(f"with {health_text}")
            
            profile_query = f"elderly {' '.join(profile_parts)} kerala welfare schemes"
            
            # Use existing recommendations logic
            similar_schemes = await chroma_client.similarity_search(profile_query, n=5)
            scheme_ids = [ObjectId(result["mongo_id"]) for result in similar_schemes if result.get("mongo_id")]
            
            if scheme_ids:
                schemes = await self.db.schemes.find({"_id": {"$in": scheme_ids}}).to_list(50)
            else:
                schemes = await self.db.schemes.find().sort("created_at", -1).limit(5).to_list(50)
            
            # Format schemes
            formatted_schemes = []
            for scheme in schemes:
                scheme["_id"] = str(scheme["_id"])
                formatted_schemes.append({
                    "id": scheme["_id"],
                    "title": scheme.get("title", ""),
                    "description": scheme.get("description", ""),
                    "benefits": scheme.get("benefits", ""),
                    "category": scheme.get("category", ""),
                    "source_url": scheme.get("source_url", "")
                })
            
            return formatted_schemes
            
        except Exception as e:
            print(f"Error getting recommendations: {e}")
            return []


    async def get_deadline_info(self, scheme_id: str) -> Dict[str, Any]:
        """Check application deadline for a scheme."""
        try:
            # Fetch scheme from MongoDB
            scheme = await self.db.schemes.find_one({"_id": ObjectId(scheme_id)})
            if not scheme:
                return {"error": "Scheme not found"}
            
            # Extract deadline information
            deadline = scheme.get("application_deadline")
            if not deadline:
                return {
                    "deadline": None,
                    "days_remaining": None,
                    "is_urgent": False,
                    "message": "No deadline specified for this scheme"
                }
            
            # Calculate days remaining
            today = datetime.utcnow()
            if isinstance(deadline, str):
                # Parse string deadline
                try:
                    deadline_date = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                except:
                    return {"error": "Invalid deadline format"}
            elif isinstance(deadline, datetime):
                deadline_date = deadline
            else:
                return {"error": "Invalid deadline type"}
            
            days_remaining = (deadline_date - today).days
            is_urgent = days_remaining <= 7 and days_remaining >= 0
            
            return {
                "deadline": deadline_date.isoformat(),
                "days_remaining": days_remaining,
                "is_urgent": is_urgent,
                "message": f"Application deadline is in {days_remaining} days" if days_remaining >= 0 else "Deadline has passed"
            }
            
        except Exception as e:
            print(f"Error getting deadline info: {e}")
            return {"error": "Failed to get deadline info"}

# Tool registry for agent
TOOLS_REGISTRY = {
    "search_schemes": {
        "function": AgentTools.search_schemes,
        "description": "Search for Kerala government welfare schemes by keyword or topic",
        "input_format": "search query string"
    },
    "check_eligibility": {
        "function": AgentTools.check_eligibility,
        "description": "Check if the current user is eligible for a specific scheme",
        "input_format": "scheme_id string"
    },
    "get_scheme_details": {
        "function": AgentTools.get_scheme_details,
        "description": "Get complete details about a specific scheme",
        "input_format": "scheme_id string"
    },
    "get_recommendations": {
        "function": AgentTools.get_recommendations,
        "description": "Get personalized scheme recommendations for the current user",
        "input_format": "empty string"
    },
    "get_deadline_info": {
        "function": AgentTools.get_deadline_info,
        "description": "Get deadline information for a specific scheme",
        "input_format": "scheme_id string"
    }
}
