from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
from core.dependencies import get_current_user
from db.mongo import get_db

router = APIRouter(prefix="/agent", tags=["agent"])

@router.get("/logs")
async def get_agent_logs(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    session_id: Optional[str] = Query(None, description="Filter by session ID"),
    limit: int = Query(10, ge=1, le=100, description="Number of logs to return"),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get agent reasoning logs with filtering options."""
    try:
        # Build query
        query = {}
        
        # If user_id is provided, filter by that user
        if user_id:
            query["user_id"] = user_id
        # If no user_id provided, only show logs for current user
        else:
            query["user_id"] = str(current_user["_id"])
        
        # If session_id is provided, filter by session
        if session_id:
            query["session_id"] = session_id
        
        # Fetch logs with pagination
        logs = await db.agent_logs.find(query).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Convert ObjectId to string and format
        formatted_logs = []
        for log in logs:
            log["_id"] = str(log["_id"])
            formatted_logs.append(log)
        
        return {
            "logs": formatted_logs,
            "total": len(formatted_logs),
            "query": query
        }
        
    except Exception as e:
        print(f"Error fetching agent logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch agent logs"
        )

@router.get("/logs/stats")
async def get_agent_stats(
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get agent usage statistics."""
    try:
        # Get stats for current user
        user_id = str(current_user["_id"])
        
        # Total sessions
        total_sessions = await db.agent_logs.distinct("session_id", {"user_id": user_id})
        
        # Total steps taken
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": None, "total_steps": {"$sum": "$total_steps"}}}
        ]
        steps_result = await db.agent_logs.aggregate(pipeline).to_list(1)
        total_steps = steps_result[0]["total_steps"] if steps_result else 0
        
        # Average steps per session
        avg_steps = total_steps / len(total_sessions) if total_sessions else 0
        
        # Most recent activity
        recent_log = await db.agent_logs.find({"user_id": user_id}).sort("created_at", -1).limit(1).to_list(1)
        last_activity = recent_log[0]["created_at"] if recent_log else None
        
        return {
            "total_sessions": len(total_sessions),
            "total_steps": total_steps,
            "avg_steps_per_session": round(avg_steps, 2),
            "last_activity": last_activity
        }
        
    except Exception as e:
        print(f"Error fetching agent stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch agent stats"
        )
