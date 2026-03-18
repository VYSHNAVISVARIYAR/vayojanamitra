from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        return {"type": "str", "custom_validator_type": "PyObjectId"}
    
    @classmethod 
    def validate_python(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    age: int = Field(..., ge=18, le=120)
    income_annual: float = Field(..., ge=0, le=5000000)
    location: str = Field(..., description="District in Kerala")
    occupation: str = Field(..., description="e.g., Retired, Farmer, Daily wage")
    health_conditions: List[str] = Field(default_factory=list)
    gender: str = Field(..., pattern="^(male|female|other)$")

class UserOut(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    email: EmailStr
    full_name: str
    age: Optional[int] = None
    income_annual: Optional[float] = None
    location: Optional[str] = None
    occupation: Optional[str] = None
    health_conditions: List[str] = Field(default_factory=list)
    gender: Optional[str] = None
    is_profile_complete: bool = False
    created_at: Optional[datetime] = None

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str
        }

class UserInDB(UserBase):
    id: PyObjectId = Field(alias="_id")
    hashed_password: str
    age: Optional[int] = None
    income_annual: Optional[float] = None
    location: Optional[str] = None
    occupation: Optional[str] = None
    health_conditions: List[str] = Field(default_factory=list)
    gender: Optional[str] = None
    is_profile_complete: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str
        }
