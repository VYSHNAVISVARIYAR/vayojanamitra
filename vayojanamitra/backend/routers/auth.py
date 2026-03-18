from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
from core.security import hash_password, verify_password, create_access_token
from core.dependencies import get_current_user
from models.user import UserRegister, UserLogin, UserOut, UserInDB
from db.mongo import get_db

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=dict)
async def register(
    user_data: UserRegister,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Register a new user."""
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password and create user
    hashed_password = hash_password(user_data.password)
    
    user_dict = {
        "email": user_data.email,
        "full_name": user_data.full_name,
        "hashed_password": hashed_password,
        "is_profile_complete": False,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    
    # Create temporary access token for profile setup (expires in 1 hour)
    access_token_expires = timedelta(hours=1)
    access_token = create_access_token(
        data={"sub": user_data.email, "type": "profile_setup"}, expires_delta=access_token_expires
    )
    
    # Get created user
    created_user = await db.users.find_one({"_id": result.inserted_id})
    created_user["_id"] = str(created_user["_id"])
    
    return {
        "message": "Registration successful! Please complete your profile setup.",
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 3600,
        "user": {
            "email": created_user["email"],
            "full_name": created_user["full_name"],
            "is_profile_complete": created_user["is_profile_complete"]
        }
    }

@router.post("/login", response_model=dict)
async def login(
    user_data: UserLogin,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Login user and return access token."""
    
    # Find user
    user = await db.users.find_one({"email": user_data.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(days=7)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    # Prepare user response
    user["_id"] = str(user["_id"])
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserOut(**user)
    }

@router.get("/me", response_model=UserOut)
async def get_current_user_profile(
    current_user: UserOut = Depends(get_current_user)
):
    """Get current user profile."""
    return current_user
