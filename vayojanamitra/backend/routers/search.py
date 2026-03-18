from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from db.mongo import get_db
from db.chroma import similarity_search
from bson import ObjectId

router = APIRouter(prefix="/search", tags=["search"])

@router.get("/")
async def search_schemes(
    q: str = Query(..., min_length=3, description="Search query"),
    limit: int = Query(8, ge=1, le=20, description="Number of results"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Global search across schemes using semantic + text search."""
    try:
        if len(q) < 3:
            return []
        
        # 1. Semantic search using ChromaDB
        semantic_results = []
        try:
            semantic_results = similarity_search(q, n=limit)
        except Exception as e:
            print(f"Semantic search error: {e}")
        
        # 2. MongoDB text search
        text_results = []
        try:
            cursor = db["schemes"].find(
                {"$text": {"$search": q}},
                {"score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).limit(limit)
            
            text_results = await cursor.to_list(None)
            
            # Convert ObjectId to string
            for result in text_results:
                result["_id"] = str(result["_id"])
                # Truncate description for results
                if "description" in result and result["description"]:
                    result["description"] = result["description"][:100] + "..." if len(result["description"]) > 100 else result["description"]
                
        except Exception as e:
            print(f"Text search error: {e}")
        
        # 3. Merge and deduplicate results
        all_results = []
        seen_ids = set()
        
        # Add semantic results first
        for result in semantic_results:
            result_id = result.get("_id")
            if result_id and result_id not in seen_ids:
                all_results.append(result)
                seen_ids.add(result_id)
        
        # Add text results
        for result in text_results:
            result_id = result.get("_id")
            if result_id and result_id not in seen_ids:
                all_results.append(result)
                seen_ids.add(result_id)
        
        # Limit results
        return all_results[:limit]
        
    except Exception as e:
        print(f"Search error: {e}")
        return []

@router.get("/suggestions")
async def get_search_suggestions(
    q: str = Query(..., min_length=2, description="Partial query for suggestions"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get search suggestions based on partial query."""
    try:
        # Simple prefix search on titles
        cursor = db["schemes"].find(
            {"title": {"$regex": f"^{q}", "$options": "i"}},
            {"title": 1, "category": 1}
        ).limit(5)
        
        suggestions = await cursor.to_list(None)
        
        # Convert ObjectId to string
        for suggestion in suggestions:
            suggestion["_id"] = str(suggestion["_id"])
        
        return suggestions
        
    except Exception as e:
        print(f"Suggestions error: {e}")
        return []
