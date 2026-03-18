from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict, Any
from bson import ObjectId
import httpx
from core.dependencies import get_current_user
from models.user import UserOut
from db.mongo import get_db
from db.chroma import chroma_client
from config import settings
from services.language_service import language_service

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.get("/health")
async def recommendations_health():
    """Health check for recommendations system."""
    try:
        # Check ChromaDB
        all_schemes = chroma_client.get_all_schemes()
        chroma_status = len(all_schemes) > 0
        
        # Check Groq API key
        api_key_status = bool(settings.GROQ_API_KEY)
        
        return {
            "status": "healthy" if chroma_status and api_key_status else "degraded",
            "chroma_schemes_count": len(all_schemes),
            "groq_configured": api_key_status,
            "recommendations_enabled": chroma_status and api_key_status
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@router.get("/", response_model=List[Dict[str, Any]])
async def get_recommendations(
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get personalized scheme recommendations for the user."""
    
    # 1. Fetch current user profile
    user = await db.users.find_one({"email": current_user.email})
    if not user:
        return []
    
    # Determine user's language preference
    target_language = language_service.get_language_preference(user)
    print(f"🌐 User language preference: {target_language}")
    
    # 2. Extract profile data for targeted filtering
    age = user.get("age", 0)
    income = user.get("income_annual", 0)
    occupation = user.get("occupation", "").lower()
    location = user.get("location", "").lower()
    health_conditions = user.get("health_conditions", [])
    
    # 3. Build targeted natural language query with profile-based filtering
    profile_parts = []
    
    # Age-based targeting
    if age >= 60:
        profile_parts.append("old age pension senior citizen elderly")
    elif age >= 50:
        profile_parts.append("middle aged approaching retirement")
    
    # Income-based targeting
    if income < settings.BPL_THRESHOLD:
        profile_parts.append("below poverty line BPL low income economically weaker section")
    elif income < settings.MIDDLE_INCOME_THRESHOLD:
        profile_parts.append("middle income group")
    else:
        profile_parts.append("higher income group")
    
    # Health-based targeting
    health_keywords = []
    for condition in health_conditions:
        condition_lower = condition.lower()
        if any(h in condition_lower for h in ["diabetes", "cancer", "heart", "bp", "blood pressure"]):
            health_keywords.append("healthcare medical treatment")
        if "disability" in condition_lower:
            health_keywords.append("disability handicapped differently abled")
        if any(h in condition_lower for h in ["vision", "blind", "sight"]):
            health_keywords.append("visual impairment blind")
    
    if health_keywords:
        profile_parts.extend(health_keywords)
    
    # Occupation-based targeting
    if "farmer" in occupation or "agriculture" in occupation:
        profile_parts.append("farmer agriculture karshaka cultivation")
    elif "government" in occupation or "public sector" in occupation:
        profile_parts.append("government employee public sector")
    elif "private" in occupation:
        profile_parts.append("private sector employee")
    elif "retired" in occupation:
        profile_parts.append("retired pensioner")
    
    # Location-based targeting
    if location:
        profile_parts.append(f"from {location} kerala")
    
    # Add basic profile info
    if age:
        profile_parts.append(f"age {age}")
    if occupation:
        profile_parts.append(occupation)
    
    profile_query = f"elderly {' '.join(profile_parts)} kerala welfare schemes"
    
    # 4. Determine priority categories based on profile
    priority_categories = []
    
    if age >= 60:
        priority_categories.append("pension")
    
    if any(h in str(health_conditions).lower() for h in ["diabetes", "cancer", "heart", "medical", "disability"]):
        priority_categories.append("healthcare")
    
    if income < settings.BPL_THRESHOLD:
        priority_categories.append("general")  # Many BPL schemes are in general
    
    if "farmer" in occupation:
        priority_categories.append("agriculture")
    
    # 5. Fetch priority schemes first
    priority_schemes = []
    if priority_categories:
        try:
            priority_schemes = await db.schemes.find(
                {"category": {"$in": priority_categories}}
            ).to_list(20)
            print(f"📊 Found {len(priority_schemes)} priority schemes from categories: {priority_categories}")
        except Exception as e:
            print(f"Error fetching priority schemes: {e}")
    
    # 6. Get user's bookmarked schemes for learning preferences
    bookmarked_schemes = []
    try:
        bookmark_ids = user.get("bookmarks", [])
        if bookmark_ids:
            # Convert string IDs to ObjectId
            bookmark_object_ids = [ObjectId(bid) for bid in bookmark_ids if isinstance(bid, str) and ObjectId.is_valid(bid)]
            bookmarked_schemes = await db.schemes.find(
                {"_id": {"$in": bookmark_object_ids}}
            ).to_list(10)
            
            # Extract categories user is interested in
            interested_categories = list(set([s["category"] for s in bookmarked_schemes]))
            print(f"📚 User interested in categories: {interested_categories}")
            
            # Boost interested categories
            for category in interested_categories:
                if category not in priority_categories:
                    priority_categories.append(category)
    except Exception as e:
        print(f"Error fetching bookmarked schemes: {e}")
    
    # 7. Check if user is asking for a specific scheme
    user_query_lower = profile_query.lower()
    specific_scheme_requests = ["rashtriya vayoshri", "alimco", "artificial limb", "disability equipment"]
    is_specific_request = any(scheme in user_query_lower for scheme in specific_scheme_requests)
    
    if is_specific_request:
        # Check if we have the specific scheme
        matching_schemes = []
        for scheme_term in specific_scheme_requests:
            if scheme_term in user_query_lower:
                mongo_schemes = await db.schemes.find({
                    "$or": [
                        {"title": {"$regex": scheme_term, "$options": "i"}},
                        {"description": {"$regex": scheme_term, "$options": "i"}}
                    ]
                }).to_list(10)
                matching_schemes.extend(mongo_schemes)
        
        if not matching_schemes:
            # Return a helpful "not found" response
            return [{
                "_id": "not_found",
                "title": "Scheme Not Found",
                "description": f"The specific scheme you're looking for is not available in our database.",
                "category": "information",
                "benefits": "We recommend checking official government websites for the latest information.",
                "eligibility": "Contact the relevant government department directly.",
                "why_recommended": "You asked about a specific scheme that we don't have in our database. Please check official sources.",
                "relevance_rank": 1,
                "fallback": True,
                "language": target_language,
                "debug_info": {
                    "specific_request": True,
                    "search_terms": [s for s in specific_scheme_requests if s in user_query_lower],
                    "total_schemes_in_db": len(await db.schemes.count_documents({}))
                }
            }]
    
    # 8. Run ChromaDB similarity search with confidence scoring
    similar_schemes = []
    try:
        similar_schemes = await chroma_client.similarity_search(profile_query, n=15)
        scheme_ids = [ObjectId(result["mongo_id"]) for result in similar_schemes if result.get("mongo_id")]
        
        # Check if similarity scores are too low (indicating poor matches)
        if similar_schemes and similar_schemes[0].get("score", 0) > 1.5:
            print(f"⚠️ Low confidence matches detected (score: {similar_schemes[0].get('score', 'N/A')})")
            # For low confidence, we'll still proceed but add a warning
    except Exception as e:
        print(f"ChromaDB search error: {e}")
        scheme_ids = []
    
    # 9. Fetch all matched schemes
    all_schemes = []
    
    # Add priority schemes first
    if priority_schemes:
        for scheme in priority_schemes:
            scheme["_id"] = str(scheme["_id"])
            scheme["is_priority"] = True
            all_schemes.append(scheme)
    
    # Add ChromaDB matches
    if scheme_ids:
        chroma_schemes = await db.schemes.find({"_id": {"$in": scheme_ids}}).to_list(50)
        for scheme in chroma_schemes:
            scheme["_id"] = str(scheme["_id"])
            scheme["is_priority"] = False
            # Avoid duplicates with priority schemes
            if not any(s["_id"] == scheme["_id"] for s in all_schemes):
                all_schemes.append(scheme)
    
    # Fallback: get recent schemes if nothing found
    if not all_schemes:
        schemes = await db.schemes.find().sort("created_at", -1).limit(10).to_list(50)
        for scheme in schemes:
            scheme["_id"] = str(scheme["_id"])
            scheme["is_priority"] = False
            all_schemes.extend(schemes)
    
    print(f"📋 Total schemes for AI ranking: {len(all_schemes)}")
    
    # 9. Use AI to re-rank and explain recommendations
    if all_schemes:
        try:
            # Prepare schemes text for AI (limit to top 10 for processing)
            schemes_text = "\n\n".join([
                f"Scheme {i+1}: {s.get('title', 'No title')}\n"
                f"Category: {s.get('category', 'No category')}\n"
                f"Description: {s.get('description', 'No description')}\n"
                f"Benefits: {s.get('benefits', 'No benefits listed')}\n"
                f"Eligibility: {s.get('eligibility', 'No eligibility criteria')}"
                f"{' (PRIORITY CATEGORY)' if s.get('is_priority') else ''}"
                for i, s in enumerate(all_schemes[:10])
            ])
            
            prompt = f"""
Given this elderly user profile from Kerala:
- Age: {age} years
- Location: {location or 'Not specified'}
- Occupation: {occupation or 'Not specified'}
- Annual Income: {income} INR per year
- Health Conditions: {', '.join(health_conditions) if health_conditions else 'None'}
- Bookmarked Categories: {list(set([s['category'] for s in bookmarked_schemes])) if bookmarked_schemes else 'None'}

And these Kerala welfare schemes:
{schemes_text}

Please:
1. Rank these schemes by relevance for this user (1 = most relevant)
2. For each scheme, add a 'why_recommended' field explaining in simple, friendly English why this scheme suits the user
3. Consider priority categories more heavily
4. Return as a JSON array with the original scheme data plus 'relevance_rank' and 'why_recommended' fields

Focus on:
- Age-appropriate schemes (pension for 60+, etc.)
- Income level eligibility
- Health condition coverage
- Location relevance
- User's demonstrated interests (bookmarks)
"""
            
            from utils.llm_rotator import llm_rotator
            content = await llm_rotator.call(prompt, max_tokens=2000, prefer="gemini")
            if not content:
                raise Exception("LLM returned empty response")
            
            # Parse AI response and merge with original schemes
            import json
            try:
                ai_recommendations = json.loads(content)
                if isinstance(ai_recommendations, list):
                    # Sort by relevance rank and return top 5
                    ai_recommendations.sort(key=lambda x: x.get('relevance_rank', 999))
                    final_recommendations = ai_recommendations[:5]
                    
                    # Standardize language for all recommendations
                    standardized_recommendations = []
                    for rec in final_recommendations:
                        # Standardize the scheme data
                        standardized_rec = language_service.standardize_scheme_language(rec, target_language)
                        
                        # Add debug info
                        standardized_rec["debug_info"] = {
                            "priority_category": standardized_rec.get("category") in priority_categories,
                            "chroma_match": standardized_rec.get("_id") in [s.get("_id") for s in similar_schemes],
                            "bookmarked_category": standardized_rec.get("category") in [s.get("category") for s in bookmarked_schemes],
                            "language": target_language
                        }
                        
                        standardized_recommendations.append(standardized_rec)
                    
                    return standardized_recommendations
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                print(f"AI response: {content}")
                
        except Exception as e:
            print(f"AI recommendation error: {e}")
    
    # Fallback: return schemes without AI ranking
    fallback_schemes = all_schemes[:5]
    standardized_fallback = []
    for scheme in fallback_schemes:
        # Standardize language
        standardized_scheme = language_service.standardize_scheme_language(scheme, target_language)
        standardized_scheme["why_recommended"] = f"This scheme may be relevant for {age}-year-old from {location or 'Kerala'}"
        standardized_scheme["relevance_rank"] = 1
        standardized_scheme["fallback"] = True
        standardized_scheme["language"] = target_language
        standardized_fallback.append(standardized_scheme)
    
    return standardized_fallback
