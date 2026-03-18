#!/usr/bin/env python3
"""Create admin user for development"""

import asyncio
import os
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
from core.security import hash_password

async def create_admin_user():
    # Connect to MongoDB using settings
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.DATABASE_NAME]
    
    # Clear existing users to start fresh
    await db.users.delete_many({})
    print("🗑️ Cleared existing users")
    
    # Admin user details - move to environment variables in production
    admin_email = os.getenv("ADMIN_EMAIL", "admin@vayojanamitra.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    
    # Create admin user with all required fields
    admin_user = {
        "email": admin_email,
        "full_name": "Admin User",
        "hashed_password": hash_password(admin_password),
        "is_profile_complete": True,
        "created_at": datetime.utcnow()
    }
    
    try:
        # Insert admin user
        result = await db.users.insert_one(admin_user)
        print(f"✅ Admin user created successfully!")
        print(f"📧 Email: {admin_email}")
        print(f"🔑 Password: {admin_password}")
        
        # Verify user was created
        created_user = await db.users.find_one({"email": admin_email})
        if created_user:
            print("✅ User verification successful!")
            print(f"📊 User ID: {created_user['_id']}")
        else:
            print("❌ User verification failed!")
            
    except Exception as e:
        print(f"❌ Error creating admin: {e}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin_user())
