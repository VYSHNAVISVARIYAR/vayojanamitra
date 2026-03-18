from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from bson import ObjectId
from pydantic import BaseModel
from core.dependencies import get_current_user
from models.user import UserOut, UserProfileUpdate
from models.scheme_schema import SchemeCreate
from db.mongo import get_db

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/profile", response_model=UserOut)
async def get_profile(
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get current user profile."""
    return current_user

class BookmarkRequest(BaseModel):
    scheme_id: str

@router.put("/profile", response_model=UserOut)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update user profile."""
    
    # Update user document
    update_data = profile_data.dict()
    update_data["is_profile_complete"] = True
    
    result = await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Return updated user
    updated_user = await db.users.find_one({"_id": ObjectId(current_user.id)})
    updated_user["_id"] = str(updated_user["_id"])
    
    return UserOut(**updated_user)

@router.get("/bookmarks", response_model=List[dict])
async def get_bookmarks(
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get user's bookmarked schemes."""
    
    # Get user with bookmarks
    user = await db.users.find_one({"_id": ObjectId(current_user.id)})
    if not user or "bookmarks" not in user:
        return []
    
    # Fetch bookmarked schemes
    scheme_ids = [ObjectId(bookmark) for bookmark in user["bookmarks"]]
    schemes = await db.schemes.find({"_id": {"$in": scheme_ids}}).to_list(100)
    
    # Convert ObjectId to string
    for scheme in schemes:
        scheme["_id"] = str(scheme["_id"])
    
    return schemes

@router.get("/bookmarks/check/{scheme_id}")
async def check_bookmark(
    scheme_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Check if a scheme is bookmarked by the user."""
    
    user = await db.users.find_one({"_id": ObjectId(current_user.id)})
    if not user or "bookmarks" not in user:
        return {"bookmarked": False}
    
    is_bookmarked = scheme_id in user.get("bookmarks", [])
    return {"bookmarked": is_bookmarked}

@router.post("/bookmarks")
async def add_bookmark(
    request: BookmarkRequest,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Add scheme to user's bookmarks."""
    
    # Check if scheme exists
    scheme = await db.schemes.find_one({"_id": ObjectId(request.scheme_id)})
    if not scheme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scheme not found"
        )
    
    # Add to user's bookmarks
    result = await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$addToSet": {"bookmarks": request.scheme_id}}
    )
    
    return {"message": "Bookmarked successfully"}

@router.delete("/bookmarks/{scheme_id}")
async def remove_bookmark(
    scheme_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Remove scheme from user's bookmarks."""
    
    # Remove from user's bookmarks
    result = await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$pull": {"bookmarks": scheme_id}}
    )
    
    return {"message": "Removed from bookmarks"}
