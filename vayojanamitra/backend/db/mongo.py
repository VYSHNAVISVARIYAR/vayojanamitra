from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

class MongoDB:
    client: AsyncIOMotorClient = None

db = MongoDB()

def get_db():
    """Returns the database instance."""
    if db.client is None:
        raise RuntimeError("Database not connected. Call connect_to_mongo() first.")
    return db.client[settings.DATABASE_NAME]

async def connect_to_mongo():
    """Initializes the MongoDB connection."""
    db.client = AsyncIOMotorClient(settings.MONGO_URI)
    print("Connected to MongoDB")
    
    # Create indexes for optimal performance
    await create_indexes()

async def create_indexes():
    """Create MongoDB indexes for optimal performance."""
    try:
        database = db.client[settings.DATABASE_NAME]
        
        # 1. Email lookup for users (unique)
        await database.users.create_index("email", unique=True)
        
        # 2. Text search for schemes
        # Note: A collection can have only ONE text index.
        # We include benefits and eligibility for better search relevance.
        await database.schemes.create_index([
            ("title", "text"),
            ("description", "text"),
            ("benefits", "text"),
            ("eligibility", "text")
        ])
        
        # 3. Categorization and sorting
        await database.schemes.create_index("category")
        await database.schemes.create_index("last_updated")
        
        print("✅ MongoDB indexes created successfully")
        
    except Exception as e:
        print(f"⚠️ Index creation warning: {e}")

async def close_mongo_connection():
    """Closes the MongoDB connection."""
    if db.client:
        db.client.close()
        print("Disconnected from MongoDB")
