from fastapi import APIRouter, Depends, HTTPException
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from bson import ObjectId
from core.dependencies import get_current_user
from models.user import UserOut
from db.mongo import get_db

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("/")
async def get_alerts(
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all alerts for the current user."""
    try:
        # Get user's alerts
        cursor = db["alerts"].find(
            {"user_id": current_user.email}
        ).sort("created_at", -1)
        
        alerts = await cursor.to_list(None)
        
        # Convert ObjectId to string
        for alert in alerts:
            if "_id" in alert:
                alert["_id"] = str(alert["_id"])
            # Convert datetime to string
            if "created_at" in alert:
                alert["created_at"] = alert["created_at"].isoformat()
        
        return alerts
        
    except Exception as e:
        print(f"Error getting alerts: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get alerts"
        )

@router.get("/unread")
async def get_unread_alerts(
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get unread alerts for the current user."""
    try:
        # Get user's unread alerts
        cursor = db["alerts"].find(
            {
                "user_id": current_user.email,
                "is_read": False
            }
        ).sort("created_at", -1)
        
        alerts = await cursor.to_list(None)
        
        # Convert ObjectId to string
        for alert in alerts:
            if "_id" in alert:
                alert["_id"] = str(alert["_id"])
            # Convert datetime to string
            if "created_at" in alert:
                alert["created_at"] = alert["created_at"].isoformat()
        
        return alerts
        
    except Exception as e:
        print(f"Error getting unread alerts: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get unread alerts"
        )

@router.put("/{alert_id}/read")
async def mark_alert_read(
    alert_id: str,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Mark a single alert as read."""
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(alert_id):
            raise HTTPException(status_code=400, detail="Invalid alert ID")
        
        # Update alert
        result = await db["alerts"].update_one(
            {
                "_id": ObjectId(alert_id),
                "user_id": current_user.email
            },
            {"$set": {"is_read": True}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return {"message": "Alert marked as read"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error marking alert as read: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to mark alert as read"
        )

@router.put("/read-all")
async def mark_all_alerts_read(
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Mark all alerts as read for the current user."""
    try:
        # Update all user's alerts
        result = await db["alerts"].update_many(
            {"user_id": current_user.email, "is_read": False},
            {"$set": {"is_read": True}}
        )
        
        return {
            "message": f"Marked {result.modified_count} alerts as read",
            "modified_count": result.modified_count
        }
        
    except Exception as e:
        print(f"Error marking all alerts as read: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to mark all alerts as read"
        )

@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: str,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete an alert."""
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(alert_id):
            raise HTTPException(status_code=400, detail="Invalid alert ID")
        
        # Delete alert
        result = await db["alerts"].delete_one(
            {
                "_id": ObjectId(alert_id),
                "user_id": current_user.email
            }
        )
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return {"message": "Alert deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting alert: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete alert"
        )

async def create_alert(
    db: AsyncIOMotorDatabase,
    user_id: str,
    scheme_id: str,
    scheme_title: str,
    alert_type: str,
    message: str
):
    """Create a new alert for a user."""
    try:
        alert = {
            "user_id": user_id,
            "scheme_id": scheme_id,
            "scheme_title": scheme_title,
            "alert_type": alert_type,
            "message": message,
            "is_read": False,
            "created_at": datetime.utcnow()
        }
        
        await db["alerts"].insert_one(alert)
        
    except Exception as e:
        print(f"Error creating alert: {e}")

async def generate_scheme_update_alert(
    db: AsyncIOMotorDatabase,
    scheme_id: str,
    scheme_title: str,
    old_data: dict,
    new_data: dict
):
    """Generate alerts for users who bookmarked a scheme that was updated."""
    try:
        # Find users who bookmarked this scheme
        cursor = db["users"].find(
            {"bookmarked_schemes": scheme_id},
            {"email": 1}
        )
        
        users = await cursor.to_list(None)
        
        # Detect what changed
        changes = []
        if old_data.get("benefits") != new_data.get("benefits"):
            changes.append("benefits")
        if old_data.get("eligibility") != new_data.get("eligibility"):
            changes.append("eligibility")
        if old_data.get("application_process") != new_data.get("application_process"):
            changes.append("application process")
        
        if not changes:
            return
        
        # Determine alert type
        alert_type = "benefit_change" if "benefits" in changes else "eligibility_change"
        
        # Generate message (simplified since OpenRouter has issues)
        change_text = ", ".join(changes)
        message = f"{scheme_title} has been updated. Changes to {change_text} may affect your eligibility."
        
        # Create alerts for all users who bookmarked this scheme
        for user in users:
            await create_alert(
                db,
                user["email"],
                scheme_id,
                scheme_title,
                alert_type,
                message
            )
        
        print(f"Created alerts for {len(users)} users for scheme {scheme_title}")
        
    except Exception as e:
        print(f"Error generating scheme update alerts: {e}")
