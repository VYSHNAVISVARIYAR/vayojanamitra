from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from bson import ObjectId
import uuid

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        return {"type": "str", "custom_validator_type": "PyObjectId"}
    
    @classmethod 
    def validate_python(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    intent: Optional[str] = None
    scheme_ids: List[str] = Field(default_factory=list)

class ChatMessageIn(BaseModel):
    session_id: str
    message: str

class ChatMessageOut(BaseModel):
    role: str
    content: str
    intent: Optional[str] = None
    scheme_cards: List[Dict[str, Any]] = Field(default_factory=list)
    eligibility_result: Optional[Dict[str, Any]] = None
    timestamp: datetime

class ChatSession(BaseModel):
    user_id: str
    session_id: str
    messages: List[ChatMessage] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: datetime = Field(default_factory=datetime.utcnow)

class ChatSessionInDB(ChatSession):
    id: PyObjectId = Field(alias="_id")
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str
        }

class ChatSessionOut(BaseModel):
    session_id: str
    messages: List[ChatMessageOut]
    created_at: datetime
    last_active: datetime
