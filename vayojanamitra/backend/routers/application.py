from fastapi import APIRouter, Depends, HTTPException, status, Body
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Dict, Any
from core.dependencies import get_current_user
from db.mongo import get_db
from pydantic import BaseModel

router = APIRouter(prefix="/application", tags=["application"])

class ProfileData(BaseModel):
    full_name: str
    age: str
    gender: str
    address: str
    phone: str
    income: str
    occupation: str
    health: str
    district: str

@router.post("/prepare/{scheme_id}")
async def prepare_application(
    scheme_id: str,
    data: Dict[str, Any] = Body(...),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Prepare an application draft for a specific scheme using user profile data.
    """
    try:
        # Fetch scheme details
        scheme = await db.schemes.find_one({"_id": scheme_id})
        if not scheme:
            # Try searching by other ID formats if needed
            scheme = await db.schemes.find_one({"id": scheme_id})
            
        if not scheme:
            raise HTTPException(status_code=404, detail="Scheme not found")
        
        profile = data.get("profile", {})
        
        # Build draft text
        draft_text = f"""
APPLICATION FOR {scheme.get('title', 'WELFARE SCHEME')}
--------------------------------------------------

To,
The Social Welfare Officer,
{profile.get('district', 'Kerala')}, Kerala.

Subject: Application for {scheme.get('title')}

Respected Sir/Madam,

I, {profile.get('full_name', '[NAME]')}, aged {profile.get('age', '[AGE]')} years, 
residing at {profile.get('address', '[ADDRESS]')}, {profile.get('district', '[DISTRICT]')}, Kerala,
hereby apply for the {scheme.get('title')}.

My details are as follows:
- Name         : {profile.get('full_name')}
- Age          : {profile.get('age')}
- Gender       : {profile.get('gender')}
- Occupation   : {profile.get('occupation')}
- Annual Income: {profile.get('income')}
- Health       : {profile.get('health')}
- Phone        : {profile.get('phone')}

I request you to kindly process my application for the benefits under this scheme.
I declare that the information provided above is true to the best of my knowledge.

Thanking you,

Yours faithfully,

(Signature)

{profile.get('full_name')}
Date: ________________
"""

        return {
            "draft_text": draft_text,
            "fields_to_fill": [
                "Aadhaar Number",
                "Bank Account Details",
                "Ration Card Number",
                "Income Certificate Reference"
            ],
            "submit_to": f"District Social Welfare Office, {profile.get('district', 'Your District')}",
            "important_notes": [
                "Ensure all documents are self-attested",
                "Carry original Aadhaar for verification",
                "Attach recent passport size photograph",
                "Submit by hand or registered post"
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error preparing application: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to prepare application: {str(e)}"
        )
