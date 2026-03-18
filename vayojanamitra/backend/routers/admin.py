from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict, Any
from datetime import datetime, timedelta
from core.dependencies import get_current_user
from models.user import UserOut
from db.mongo import get_db
from bson import ObjectId

router = APIRouter(prefix="/admin", tags=["admin"])

async def require_admin(current_user: UserOut = Depends(get_current_user)) -> UserOut:
    """Require admin access"""
    # For demo purposes, check if user email contains admin or test
    # In production, use proper role-based access control
    if not any(keyword in current_user.email.lower() for keyword in ["admin", "test"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: UserOut = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get dashboard statistics"""
    try:
        # Total users
        total_users = await db.users.count_documents({})
        
        # Total schemes
        total_schemes = await db.schemes.count_documents({})
        
        # Total eligibility checks (from chat history)
        total_eligibility_checks = await db.chat_sessions.count_documents({
            "messages.agent_thoughts": {"$exists": True}
        })
        
        # Active users in last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        active_users = await db.users.count_documents({
            "last_login": {"$gte": thirty_days_ago}
        })
        
        # Most searched schemes (from chat history)
        pipeline = [
            {"$unwind": "$messages"},
            {"$match": {"messages.sender": "user"}},
            {"$group": {
                "_id": "$messages.text",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        
        search_results = await db.chat_sessions.aggregate(pipeline).to_list(length=10)
        most_searched = [
            {"query": result["_id"], "count": result["count"]}
            for result in search_results
        ]
        
        return {
            "total_users": total_users,
            "total_schemes": total_schemes,
            "total_eligibility_checks": total_eligibility_checks,
            "active_users": active_users,
            "most_searched": most_searched,
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching dashboard stats: {str(e)}"
        )

@router.get("/scraper/status")
async def get_scraper_status(
    current_user: UserOut = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get scraper status for different URLs"""
    try:
        # Get latest scrape results
        pipeline = [
            {"$sort": {"scraped_at": -1}},
            {"$group": {
                "_id": "$source_url",
                "latest_status": {"$first": "$status"},
                "latest_scrape": {"$first": "$scraped_at"},
                "schemes_found": {"$first": "$schemes_found"}
            }},
            {"$sort": {"_id": 1}}
        ]
        
        scraper_results = await db.scrape_results.aggregate(pipeline).to_list(length=50)
        
        status_summary = {
            "total_urls": len(scraper_results),
            "working_urls": len([r for r in scraper_results if r["latest_status"] == "success"]),
            "failing_urls": len([r for r in scraper_results if r["latest_status"] == "failed"]),
            "urls": []
        }
        
        for result in scraper_results:
            status_summary["urls"].append({
                "url": result["_id"],
                "status": result["latest_status"],
                "last_scrape": result["latest_scrape"],
                "schemes_found": result.get("schemes_found", 0)
            })
        
        return status_summary
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching scraper status: {str(e)}"
        )

@router.get("/user-activity")
async def get_user_activity(
    days: int = 30,
    current_user: UserOut = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get user activity over time"""
    try:
        days_ago = datetime.utcnow() - timedelta(days=days)
        
        # Daily user registrations
        pipeline = [
            {"$match": {"created_at": {"$gte": days_ago}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        
        registrations = await db.users.aggregate(pipeline).to_list(length=days)
        
        # Daily chat sessions
        chat_pipeline = [
            {"$match": {"created_at": {"$gte": days_ago}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        
        chats = await db.chat_sessions.aggregate(chat_pipeline).to_list(length=days)
        
        return {
            "registrations": [
                {"date": r["_id"], "count": r["count"]}
                for r in registrations
            ],
            "chats": [
                {"date": c["_id"], "count": c["count"]}
                for c in chats
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching user activity: {str(e)}"
        )
