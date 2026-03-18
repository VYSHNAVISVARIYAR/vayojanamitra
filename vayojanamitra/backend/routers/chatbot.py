from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
import uuid
from core.dependencies import get_current_user
from models.user import UserOut
from models.chat import ChatMessageIn, ChatSessionOut
from agents.react_agent import ReActAgent
from agents.memory import ConversationMemory
from db.mongo import get_db

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

@router.post("/new-session")
async def create_new_session(
    current_user: UserOut = Depends(get_current_user)
):
    """Create a new chat session."""
    session_id = str(uuid.uuid4())
    return {"session_id": session_id}

@router.post("/message")
async def send_message(
    body: ChatMessageIn,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Send a message and get agentic AI response."""
    try:
        agent = ReActAgent(
            user_id=str(current_user.id),
            session_id=body.session_id,
            db=db
        )
        print("before result")
        result = await agent.run(body.message)
        print("after result")
        
        # Save to conversation memory as before
        memory = ConversationMemory(str(current_user.id), body.session_id, db)
        await memory.add_message(
            role="user", content=body.message, intent="agentic"
        )
        print("after add message")
        await memory.add_message(
            role="assistant",
            content=result["response"],
            intent="agentic",
            scheme_ids=[s.get("id") for s in result["scheme_cards"]]
        )
        print("after final add message")
        
        return {
            "response": result["response"],
            "intent": "agentic",
            "scheme_cards": result["scheme_cards"],
            "eligibility_result": result["eligibility_result"],
            "session_id": body.session_id,
            "steps_taken": result["steps_taken"],          # show in UI
            "agent_thoughts": result["agent_thoughts"]     # for transparency panel
        }
        
    except Exception as e:
        print(f"Error processing message: {e}")
        # Return a helpful fallback response instead of the error
        return {
            "response": "Hello! I'm Mitra, your welfare scheme assistant. I'm currently having some technical difficulties, but I'm here to help you. You can try asking me again in a moment, or you can explore schemes using the main menu. For immediate assistance, you can visit your nearest Kerala Social Security Mission office.",
            "steps_taken": 0,
            "scheme_cards": [],
            "eligibility_result": None,
            "agent_thoughts": ["Technical difficulty occurred"],
            "session_id": body.session_id
        }
    except HTTPException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process message"
        )

@router.get("/history/{session_id}")
async def get_chat_history(
    session_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get full conversation history for a session."""
    try:
        memory = ConversationMemory(str(current_user.id), session_id, db)
        
        messages = await memory.get_session_messages()
        
        return ChatSessionOut(
            session_id=session_id,
            messages=messages,
            created_at=None,  # Will be populated if needed
            last_active=None
        )
        
    except Exception as e:
        print(f"Error getting chat history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get chat history"
        )

@router.post("/eligibility/{scheme_id}")
async def check_eligibility_direct(
    scheme_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Directly trigger eligibility check for a scheme."""
    try:
        from agents.tools import AgentTools
        tools = AgentTools(db)
        
        # Check eligibility - convert Pydantic model to dict
        user_data = current_user.model_dump() if hasattr(current_user, 'model_dump') else current_user.dict()
        result = await tools.check_eligibility(scheme_id, user_data)
        
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error checking eligibility: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check eligibility"
        )
