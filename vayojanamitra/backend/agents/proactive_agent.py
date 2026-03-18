from datetime import datetime, timedelta
import asyncio

class ProactiveAgent:
    """
    Runs autonomously every 24 hours WITHOUT user prompting.
    This is what makes the system truly agentic.
    """
    
    def __init__(self, db):
        self.db = db
    
    async def run_daily_checks(self):
        """Main entry — called by APScheduler every 24 hours"""
        print("🤖 Proactive Agent starting daily checks...")
        
        users = await self.db.users.find(
            {"is_profile_complete": True}
        ).to_list(length=None)
        
        for user in users:
            try:
                await self._check_user(user)
                await asyncio.sleep(1)  # rate limit between users
            except Exception as e:
                print(f"Proactive agent error for user {user['_id']}: {e}")
        
        print(f"✅ Proactive Agent completed checks for {len(users)} users")
    
    async def _check_user(self, user):
        """Run all autonomous checks for a single user"""
        
        user_id = str(user["_id"])
        alerts_to_create = []
        
        # ── Check 1: New eligible schemes discovered ──
        new_schemes = await self._find_new_eligible_schemes(user)
        for scheme in new_schemes:
            alerts_to_create.append({
                "user_id": user_id,
                "scheme_id": str(scheme["_id"]),
                "scheme_title": scheme["title"],
                "alert_type": "new_scheme",
                "message": f"New scheme found for you: '{scheme['title']}' — "
                           f"you may be eligible based on your profile.",
                "is_read": False,
                "created_at": datetime.utcnow()
            })
        
        # ── Check 2: Approaching deadlines on bookmarked schemes ──
        deadline_alerts = await self._check_deadlines(user)
        alerts_to_create.extend(deadline_alerts)
        
        # ── Check 3: Bookmarked scheme content changed ──
        update_alerts = await self._check_scheme_updates(user)
        alerts_to_create.extend(update_alerts)
        
        # ── Check 4: Incomplete profile nudge ──
        nudge = await self._check_profile_nudge(user)
        if nudge:
            alerts_to_create.append(nudge)
        
        # Save all alerts
        if alerts_to_create:
            await self.db.alerts.insert_many(alerts_to_create)
            print(f"   Created {len(alerts_to_create)} alerts for user {user_id}")
    
    async def _find_new_eligible_schemes(self, user) -> list:
        """Autonomously find schemes user hasn't seen but might qualify for"""
        
        # Get schemes added in last 7 days
        week_ago = datetime.utcnow() - timedelta(days=7)
        new_schemes = await self.db.schemes.find(
            {"last_updated": {"$gte": week_ago}}
        ).to_list(length=None)
        
        # Get schemes user already knows about
        user_bookmarks = user.get("bookmarks", [])
        seen_scheme_ids = [str(s) for s in user_bookmarks]
        
        eligible_new = []
        
        for scheme in new_schemes:
            if str(scheme["_id"]) in seen_scheme_ids:
                continue
            
            # Quick eligibility pre-filter (without full AI call)
            if self._quick_eligibility_filter(user, scheme):
                eligible_new.append(scheme)
        
        return eligible_new[:3]  # max 3 new scheme alerts per day
    
    def _quick_eligibility_filter(self, user, scheme) -> bool:
        """
        Fast rule-based pre-filter before expensive AI eligibility check.
        Avoids calling AI for every scheme for every user.
        """
        eligibility_text = scheme.get("eligibility", "").lower()
        
        # Age check
        age = user.get("age", 0)
        if "60+" in eligibility_text or "above 60" in eligibility_text:
            if age < 60:
                return False
        if "65+" in eligibility_text:
            if age < 65:
                return False
        
        # Income check
        income = user.get("income_annual", 0)
        if "below 1 lakh" in eligibility_text or "less than 1 lakh" in eligibility_text:
            if income > 100000:
                return False
        
        # Category match
        health = [h.lower() for h in user.get("health_conditions", [])]
        category = scheme.get("category", "").lower()
        if category == "disability" and "disability" not in health:
            return False
        
        return True  # passes pre-filter
    
    async def _check_deadlines(self, user) -> list:
        """Alert users about approaching deadlines on bookmarked schemes"""
        
        alerts = []
        bookmarks = user.get("bookmarks", [])
        
        if not bookmarks:
            return alerts
        
        from bson import ObjectId
        bookmark_ids = [ObjectId(b) for b in bookmarks]
        
        schemes = await self.db.schemes.find(
            {
                "_id": {"$in": bookmark_ids},
                "application_deadline": {"$exists": True, "$ne": None}
            }
        ).to_list(length=None)
        
        today = datetime.utcnow()
        
        for scheme in schemes:
            deadline = scheme.get("application_deadline")
            if not deadline:
                continue
            
            days_left = (deadline - today).days
            
            if days_left in [7, 3, 1]:  # alert at 7, 3, and 1 day
                urgency = "🚨 URGENT" if days_left == 1 else "⚠️ Reminder"
                alerts.append({
                    "user_id": str(user["_id"]),
                    "scheme_id": str(scheme["_id"]),
                    "scheme_title": scheme["title"],
                    "alert_type": "deadline",
                    "message": f"{urgency}: Application deadline for "
                               f"'{scheme['title']}' is in {days_left} day(s). "
                               f"Visit your nearest office soon.",
                    "is_read": False,
                    "created_at": datetime.utcnow()
                })
        
        return alerts
    
    async def _check_scheme_updates(self, user) -> list:
        """Detect if bookmarked schemes have been updated by scraper"""
        
        alerts = []
        bookmarks = user.get("bookmarks", [])
        
        if not bookmarks:
            return alerts
        
        from bson import ObjectId
        yesterday = datetime.utcnow() - timedelta(days=1)
        
        updated_schemes = await self.db.schemes.find(
            {
                "_id": {"$in": [ObjectId(b) for b in bookmarks]},
                "last_updated": {"$gte": yesterday}
            }
        ).to_list(length=None)
        
        for scheme in updated_schemes:
            alerts.append({
                "user_id": str(user["_id"]),
                "scheme_id": str(scheme["_id"]),
                "scheme_title": scheme["title"],
                "alert_type": "benefit_change",
                "message": f"'{scheme['title']}' was recently updated. "
                           f"Check if eligibility or benefits have changed.",
                "is_read": False,
                "created_at": datetime.utcnow()
            })
        
        return alerts
    
    async def _check_profile_nudge(self, user) -> dict | None:
        """Nudge users who haven't completed their profile"""
        
        if user.get("is_profile_complete"):
            return None
        
        created = user.get("created_at", datetime.utcnow())
        days_since_join = (datetime.utcnow() - created).days
        
        # Only nudge after 2 days of joining
        if days_since_join < 2:
            return None
        
        return {
            "user_id": str(user["_id"]),
            "scheme_id": None,
            "scheme_title": None,
            "alert_type": "new_scheme",
            "message": "Complete your profile to get personalized scheme "
                       "recommendations and eligibility checks tailored for you!",
            "is_read": False,
            "created_at": datetime.utcnow()
        }
