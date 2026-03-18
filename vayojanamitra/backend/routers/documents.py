from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from io import BytesIO
from core.dependencies import get_current_user
from models.user import UserOut
from agents.document_agent import DocumentAgent
from utils.pdf_generator import generate_application_pdf
from db.mongo import get_db

router = APIRouter(prefix="/documents", tags=["documents"])

@router.get("/guidance/{scheme_id}")
async def get_document_guidance(
    scheme_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get personalized document guidance for a scheme."""
    try:
        # Initialize document agent
        agent = DocumentAgent(db)
        
        # Get document guidance
        guidance = await agent.get_document_guidance(scheme_id, current_user.email)
        
        if "error" in guidance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=guidance["error"]
            )
        
        return guidance
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting document guidance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get document guidance"
        )

@router.get("/application-draft/{scheme_id}")
async def get_application_draft(
    scheme_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Generate application draft for a scheme."""
    try:
        # Initialize document agent
        agent = DocumentAgent(db)
        
        # Generate application draft
        draft = await agent.generate_application_draft(scheme_id, current_user.email)
        
        if "error" in draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=draft["error"]
            )
        
        return draft
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating application draft: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate application draft"
        )

@router.get("/application-pdf/{scheme_id}")
async def get_application_pdf(
    scheme_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Generate and download application draft as PDF."""
    try:
        # Initialize document agent
        agent = DocumentAgent(db)
        
        # Generate application draft
        draft = await agent.generate_application_draft(scheme_id, current_user.email)
        
        if "error" in draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=draft["error"]
            )
        
        # Generate PDF
        pdf_bytes = generate_application_pdf(draft, current_user.full_name)
        
        # Return as streaming response
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=application_draft_{scheme_id}.pdf"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating PDF: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF"
        )

@router.post("/compare")
async def compare_schemes(
    scheme_ids: List[str],
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Compare multiple schemes with AI analysis."""
    try:
        if len(scheme_ids) > 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 3 schemes can be compared"
            )
        
        if len(scheme_ids) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least 2 schemes are required for comparison"
            )
        
        # Fetch all schemes
        from bson import ObjectId
        schemes = []
        for scheme_id in scheme_ids:
            scheme = await db.schemes.find_one({"_id": ObjectId(scheme_id)})
            if scheme:
                scheme["_id"] = str(scheme["_id"])
                schemes.append(scheme)
        
        if len(schemes) < 2:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Not enough valid schemes found"
            )
        
        # Generate AI comparison
        import httpx
        from config import settings
        
        # Build schemes text for AI
        schemes_text = "\n\n".join([
            f"Scheme {i+1}: {s.get('title', 'No title')}\n"
            f"Description: {s.get('description', 'No description')}\n"
            f"Benefits: {s.get('benefits', 'No benefits listed')}\n"
            f"Eligibility: {s.get('eligibility', 'No eligibility criteria')}\n"
            f"Application Process: {s.get('application_process', 'Not specified')}\n"
            f"Category: {s.get('category', 'General')}"
            for i, s in enumerate(schemes)
        ])
        
        prompt = f"""
Compare these Kerala welfare schemes for an elderly citizen.
Highlight key differences in benefits, eligibility, and ease of application.
Return JSON: {{
  "summary": "Overall comparison summary",
  "winner_for_elderly": "Best scheme for elderly citizens and why",
  "comparison_table": [
    {{
      "field": "Benefits",
      "scheme1": "Description of benefits for scheme 1",
      "scheme2": "Description of benefits for scheme 2",
      "scheme3": "Description of benefits for scheme 3 (if applicable)"
    }}
  ]
}}

{schemes_text}
"""
        
        from utils.llm import call_llm
        content = await call_llm(prompt, max_tokens=2000)
        
        if not content:
            raise Exception("LLM returned empty response")
        
        # Parse AI response
        import json
        try:
            comparison = json.loads(content)
            
            # Add schemes data
            comparison["schemes"] = schemes
            
            return comparison
            
        except json.JSONDecodeError:
            return {
                "schemes": schemes,
                "summary": "Unable to generate AI comparison",
                "winner_for_elderly": "Unable to determine",
                "comparison_table": []
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error comparing schemes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compare schemes"
        )
