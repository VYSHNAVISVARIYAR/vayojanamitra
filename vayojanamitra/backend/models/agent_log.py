from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class AgentStep(BaseModel):
    step_number: int
    thought: str
    action: str
    action_input: str
    observation: str
    timestamp: datetime

class AgentLogCreate(BaseModel):
    session_id: str
    user_id: str
    user_message: str
    steps: List[AgentStep]
    final_response: str
    total_steps: int
    total_time_ms: int
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AgentLogOut(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    session_id: str
    user_id: str
    user_message: str
    steps: List[AgentStep]
    final_response: str
    total_steps: int
    total_time_ms: int
    created_at: datetime
    
    class Config:
        populate_by_name = True
