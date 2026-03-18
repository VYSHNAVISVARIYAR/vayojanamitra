"""
Deadline Agent - Handles deadline-related tasks and notifications
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

class DeadlineAgent:
    """Agent for handling scheme deadlines and notifications."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def run_daily_checks(self):
        """Run daily deadline checks and send notifications."""
        try:
            logger.info("🕐 Running daily deadline checks...")
            
            # Check for upcoming deadlines
            upcoming_deadlines = await self.get_upcoming_deadlines()
            
            if upcoming_deadlines:
                logger.info(f"Found {len(upcoming_deadlines)} upcoming deadlines")
                await self.send_deadline_notifications(upcoming_deadlines)
            else:
                logger.info("No upcoming deadlines found")
                
        except Exception as e:
            logger.error(f"Error in daily deadline checks: {e}")
    
    async def get_upcoming_deadlines(self, days_ahead: int = 7) -> list:
        """Get schemes with deadlines in the next N days."""
        try:
            cutoff_date = datetime.now() + timedelta(days=days_ahead)
            
            # Find schemes with upcoming deadlines
            schemes = await self.db.schemes.find({
                "deadline": {"$lte": cutoff_date, "$gte": datetime.now()},
                "deadline": {"$ne": None}
            }).to_list(50)
            
            return schemes
        except Exception as e:
            logger.error(f"Error getting upcoming deadlines: {e}")
            return []
    
    async def send_deadline_notifications(self, schemes: list):
        """Send notifications for upcoming deadlines."""
        try:
            for scheme in schemes:
                deadline = scheme.get("deadline")
                if deadline:
                    days_remaining = (deadline - datetime.now()).days
                    
                    # Create alert for users
                    await self.create_deadline_alert(scheme, days_remaining)
                    
        except Exception as e:
            logger.error(f"Error sending deadline notifications: {e}")
    
    async def create_deadline_alert(self, scheme: dict, days_remaining: int):
        """Create an alert for a scheme deadline."""
        try:
            alert_data = {
                "title": f"Scheme Deadline: {scheme.get('title', 'Unknown Scheme')}",
                "message": f"Application deadline is {days_remaining} days away",
                "scheme_id": str(scheme["_id"]),
                "deadline": scheme.get("deadline"),
                "type": "deadline_reminder",
                "created_at": datetime.now(),
                "is_read": False
            }
            
            # Insert alert for all users (you might want to target specific users)
            await self.db.alerts.insert_one(alert_data)
            
        except Exception as e:
            logger.error(f"Error creating deadline alert: {e}")

async def get_deadline_agent(db: AsyncIOMotorDatabase) -> DeadlineAgent:
    """Get deadline agent instance."""
    return DeadlineAgent(db)
