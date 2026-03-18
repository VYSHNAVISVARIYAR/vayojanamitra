from typing import Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import httpx
from config import settings

class DocumentAgent:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def get_document_guidance(self, scheme_id: str, user_id: str) -> Dict[str, Any]:
        """Get personalized document guidance for a scheme."""
        try:
            # Fetch scheme and user profile
            scheme = await self.db.schemes.find_one({"_id": ObjectId(scheme_id)})
            user = await self.db.users.find_one({"email": user_id})
            
            if not scheme:
                return {"error": "Scheme not found"}
            if not user:
                return {"error": "User not found"}

            # Build prompt for OpenRouter
            prompt = f"""
System: You are a document guidance assistant for Kerala government welfare schemes.
Be practical and specific. The user is elderly and may need simple instructions.

Scheme: {scheme.get('title', 'Unknown')}
Documents Required (raw): {scheme.get('documents_required', [])}
User Profile: age={user.get('age', 'Not specified')}, location={user.get('location', 'Not specified')}, occupation={user.get('occupation', 'Not specified')}

Generate a detailed document checklist. Return ONLY this JSON:
{{
  "documents": [
    {{
      "name": "Aadhaar Card",
      "purpose": "Identity and address proof",
      "how_to_get": "Visit nearest Akshaya center or uidai.gov.in",
      "is_mandatory": true,
      "alternatives": ["Voter ID", "Passport"],
      "user_likely_has": true
    }}
  ],
  "total_documents": 5,
  "estimated_preparation_days": 3,
  "tips": "Carry 2 photocopies of each document"
}}
"""
            
            from utils.llm import call_llm
            content = await call_llm(prompt, max_tokens=1500)
            
            if not content:
                raise Exception("LLM returned empty response")
            
            # Parse JSON response
            import json
            try:
                guidance = json.loads(content)
                
                # Add scheme information
                guidance["scheme"] = {
                    "id": scheme_id,
                    "title": scheme.get("title", ""),
                    "category": scheme.get("category", "")
                }
                
                return guidance
                
            except json.JSONDecodeError as e:
                print(f"JSON parse error: {e}")
                return {"error": "Failed to parse document guidance"}
                
        except Exception as e:
            print(f"Error getting document guidance: {e}")
            return {"error": "Document guidance failed"}

    async def generate_application_draft(self, scheme_id: str, user_id: str) -> Dict[str, Any]:
        """Generate application draft for a scheme."""
        try:
            # Fetch scheme and user profile
            scheme = await self.db.schemes.find_one({"_id": ObjectId(scheme_id)})
            user = await self.db.users.find_one({"email": user_id})
            
            if not scheme:
                return {"error": "Scheme not found"}
            if not user:
                return {"error": "User not found"}

            # Build prompt for OpenRouter
            prompt = f"""
Generate a simple offline application draft for this Kerala government scheme.
Use formal Malayalam-style English salutation.

Scheme: {scheme.get('title', 'Unknown')}
Applicant Details:
- Name: {user.get('full_name', 'Applicant Name')}
- Age: {user.get('age', 'Age')}
- Address: {user.get('location', 'District')}, Kerala
- Contact: (to be filled)
- Annual Income: Rs {user.get('income_annual', 'Income')}
- Occupation: {user.get('occupation', 'Occupation')}

Return ONLY this JSON:
{{
  "draft_text": "Full application letter text here...",
  "fields_to_fill": ["Phone number", "Ward number", "Bank account number"],
  "submit_to": "Village Office / Panchayat Office",
  "important_notes": ["Attach self-attested copies", "Apply before scheme deadline"]
}}
"""
            
            from utils.llm import call_llm
            content = await call_llm(prompt, max_tokens=2000)
            
            if not content:
                raise Exception("LLM returned empty response")
            
            # Parse JSON response
            import json
            try:
                draft = json.loads(content)
                
                # Add scheme information
                draft["scheme"] = {
                    "id": scheme_id,
                    "title": scheme.get("title", ""),
                    "category": scheme.get("category", "")
                }
                
                return draft
                
            except json.JSONDecodeError as e:
                print(f"JSON parse error: {e}")
                return {"error": "Failed to parse application draft"}
                
        except Exception as e:
            print(f"Error generating application draft: {e}")
            return {"error": "Application draft generation failed"}
