from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
from core.dependencies import get_current_user
from models.user import UserOut
from db.mongo import get_db

router = APIRouter(prefix="/deadline-calendar", tags=["deadline-calendar"])

@router.get("/schemes")
async def get_deadline_schemes(
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all schemes with deadlines for calendar view."""
    try:
        today = datetime.utcnow()
        
        # Find schemes with application deadlines
        schemes = await db.schemes.find({
            "application_deadline": {"$exists": True, "$ne": None}
        }).to_list(100)
        
        deadline_schemes = []
        
        for scheme in schemes:
            deadline = scheme.get("application_deadline")
            if not deadline:
                continue
                
            # Parse deadline
            if isinstance(deadline, str):
                try:
                    deadline_date = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                except:
                    continue
            elif isinstance(deadline, datetime):
                deadline_date = deadline
            else:
                continue
            
            # Calculate days remaining
            days_remaining = (deadline_date - today).days
            
            # Determine urgency status
            if days_remaining < 0:
                status = "expired"
                color = "gray"
            elif days_remaining <= 7:
                status = "urgent"
                color = "red"
            elif days_remaining <= 30:
                status = "soon"
                color = "yellow"
            else:
                status = "plenty"
                color = "green"
            
            deadline_schemes.append({
                "id": str(scheme["_id"]),
                "title": scheme.get("title", "Unknown Scheme"),
                "category": scheme.get("category", "general"),
                "deadline": deadline_date.isoformat(),
                "days_remaining": days_remaining,
                "status": status,
                "color": color,
                "description": scheme.get("description", "")[:200] + "..." if len(scheme.get("description", "")) > 200 else scheme.get("description", ""),
                "benefits": scheme.get("benefits", ""),
                "source_url": scheme.get("source_url", "")
            })
        
        # Sort by deadline (closest first)
        deadline_schemes.sort(key=lambda x: x["days_remaining"])
        
        return {
            "schemes": deadline_schemes,
            "total_count": len(deadline_schemes),
            "urgent_count": len([s for s in deadline_schemes if s["status"] == "urgent"]),
            "soon_count": len([s for s in deadline_schemes if s["status"] == "soon"]),
            "plenty_count": len([s for s in deadline_schemes if s["status"] == "plenty"]),
            "expired_count": len([s for s in deadline_schemes if s["status"] == "expired"])
        }
        
    except Exception as e:
        print(f"Error getting deadline schemes: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch deadline schemes")

@router.get("/alerts")
async def get_deadline_alerts(
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get deadline alerts for the user (7/3/1 days before)."""
    try:
        today = datetime.utcnow()
        
        # Check alert periods
        alert_periods = [7, 3, 1]  # days before deadline
        alerts = []
        
        for days in alert_periods:
            target_date = today + timedelta(days=days)
            
            # Find schemes with deadlines on target date
            schemes = await db.schemes.find({
                "application_deadline": {
                    "$gte": target_date.replace(hour=0, minute=0, second=0, microsecond=0),
                    "$lt": target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
                }
            }).to_list(50)
            
            for scheme in schemes:
                alerts.append({
                    "id": str(scheme["_id"]),
                    "scheme_title": scheme.get("title", "Unknown Scheme"),
                    "category": scheme.get("category", "general"),
                    "deadline": scheme["application_deadline"].isoformat() if isinstance(scheme["application_deadline"], datetime) else scheme["application_deadline"],
                    "days_until": days,
                    "alert_type": "deadline_reminder",
                    "message": f"📅 Deadline Alert: {scheme.get('title', 'Unknown Scheme')} deadline in {days} days!",
                    "priority": "high" if days <= 3 else "medium",
                    "description": scheme.get("description", "")[:150] + "..." if len(scheme.get("description", "")) > 150 else scheme.get("description", "")
                })
        
        # Sort by priority and days until
        alerts.sort(key=lambda x: (x["days_until"], x["priority"]))
        
        return {
            "alerts": alerts,
            "total_alerts": len(alerts),
            "high_priority": len([a for a in alerts if a["priority"] == "high"]),
            "medium_priority": len([a for a in alerts if a["priority"] == "medium"])
        }
        
    except Exception as e:
        print(f"Error getting deadline alerts: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch deadline alerts")

@router.post("/remind/{scheme_id}")
async def set_reminder(
    scheme_id: str,
    days_before: int = 7,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Set a reminder for a specific scheme deadline."""
    try:
        # Check if scheme exists
        scheme = await db.schemes.find_one({"_id": ObjectId(scheme_id)})
        if not scheme:
            raise HTTPException(status_code=404, detail="Scheme not found")
        
        # Create reminder record
        reminder = {
            "user_id": str(current_user.id),
            "scheme_id": scheme_id,
            "scheme_title": scheme.get("title", "Unknown Scheme"),
            "deadline": scheme.get("application_deadline"),
            "days_before": days_before,
            "reminder_date": None,  # Will be calculated by background agent
            "is_active": True,
            "created_at": datetime.utcnow(),
            "notified": False
        }
        
        # Calculate reminder date if deadline exists
        if scheme.get("application_deadline"):
            if isinstance(scheme["application_deadline"], datetime):
                deadline_date = scheme["application_deadline"]
            else:
                deadline_date = datetime.fromisoformat(scheme["application_deadline"].replace('Z', '+00:00'))
            
            reminder["reminder_date"] = deadline_date - timedelta(days=days_before)
        
        # Save reminder
        await db.deadline_reminders.insert_one(reminder)
        
        return {
            "message": f"Reminder set for {scheme.get('title', 'Unknown Scheme')} - {days_before} days before deadline",
            "reminder": {
                "scheme_title": scheme.get("title", "Unknown Scheme"),
                "days_before": days_before,
                "reminder_date": reminder["reminder_date"].isoformat() if reminder["reminder_date"] else None
            }
        }
        
    except Exception as e:
        print(f"Error setting reminder: {e}")
        raise HTTPException(status_code=500, detail="Failed to set reminder")

@router.get("/my-reminders")
async def get_my_reminders(
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all reminders for the current user."""
    try:
        reminders = await db.deadline_reminders.find({
            "user_id": str(current_user.id),
            "is_active": True
        }).sort("reminder_date", 1).to_list(50)
        
        formatted_reminders = []
        for reminder in reminders:
            formatted_reminders.append({
                "id": str(reminder["_id"]),
                "scheme_title": reminder.get("scheme_title", "Unknown Scheme"),
                "scheme_id": reminder.get("scheme_id"),
                "deadline": reminder.get("deadline"),
                "days_before": reminder.get("days_before"),
                "reminder_date": reminder.get("reminder_date"),
                "notified": reminder.get("notified", False),
                "created_at": reminder.get("created_at")
            })
        
        return {
            "reminders": formatted_reminders,
            "total_count": len(formatted_reminders)
        }
        
    except Exception as e:
        print(f"Error getting reminders: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch reminders")

@router.delete("/reminder/{reminder_id}")
async def delete_reminder(
    reminder_id: str,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a reminder."""
    try:
        result = await db.deadline_reminders.delete_one({
            "_id": ObjectId(reminder_id),
            "user_id": str(current_user.id)
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Reminder not found")
        
        return {"message": "Reminder deleted successfully"}
        
    except Exception as e:
        print(f"Error deleting reminder: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete reminder")
