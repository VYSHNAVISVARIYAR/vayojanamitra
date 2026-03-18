from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from models.scheme_schema import SchemeInDB, SchemeCreate
from db.mongo import get_db
from db.chroma import similarity_search
from bson import ObjectId
from pymongo import ASCENDING
from services.simplifier import simplifier
from services.language_service import language_service
from core.dependencies import get_current_user
from models.user import UserOut

router = APIRouter(prefix="/schemes", tags=["schemes"])

@router.get("/")
async def get_schemes(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    category: Optional[str] = Query(None, description="Filter by category"),
    state: Optional[str] = Query(None, description="Filter by state"),
    q: Optional[str] = Query(None, description="Search query"),
    sort: Optional[str] = Query("latest", description="Sort by: latest, az, relevant"),
    current_user: Optional[UserOut] = Depends(get_current_user),
    db = Depends(get_db)
):
    """List all schemes with pagination, filtering, and sorting."""
    try:
        # Determine user's language preference
        target_language = 'english'  # Default to English
        if current_user:
            # Get user profile to check language preference
            user_profile = await db.users.find_one({"email": current_user.email})
            if user_profile:
                target_language = language_service.get_language_preference(user_profile)
        
        # Build filter query
        filter_query = {}
        if category:
            filter_query["category"] = category
        if state:
            filter_query["state"] = state
        if q:
            # Text search
            filter_query["$text"] = {"$search": q}
            
        # Calculate skip for pagination
        skip = (page - 1) * limit
        
        # Determine sort order
        sort_field = "last_updated"
        sort_direction = -1  # descending by default
        
        if sort == "name_asc":
            sort_field = "title"
            sort_direction = 1
            cursor = db["schemes"].find(filter_query).sort(sort_field, sort_direction).skip(skip).limit(limit)
        elif sort == "name_desc":
            sort_field = "title"
            sort_direction = -1
            cursor = db["schemes"].find(filter_query).sort(sort_field, sort_direction).skip(skip).limit(limit)
        elif sort == "oldest":
            sort_field = "last_updated"
            sort_direction = 1
            cursor = db["schemes"].find(filter_query).sort(sort_field, sort_direction).skip(skip).limit(limit)
        elif sort == "category":
            sort_field = "category"
            sort_direction = 1
            cursor = db["schemes"].find(filter_query).sort(sort_field, sort_direction).skip(skip).limit(limit)
        elif sort == "az":  # Legacy support
            sort_field = "title"
            sort_direction = 1
            cursor = db["schemes"].find(filter_query).sort(sort_field, sort_direction).skip(skip).limit(limit)
        elif sort == "relevant" and q:
            # For relevant search, use text score
            cursor = db["schemes"].find(
                filter_query,
                {"score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).skip(skip).limit(limit)
        else:
            # Default sort by latest (descending)
            cursor = db["schemes"].find(filter_query).sort(sort_field, sort_direction).skip(skip).limit(limit)
        
        schemes = await cursor.to_list(length=limit)
        
        # Get total count for pagination
        total = await db["schemes"].count_documents(filter_query)
        
        # Convert to Pydantic models for proper serialization
        scheme_models = []
        for scheme in schemes:
            # Standardize language to user's preference
            standardized_scheme = await language_service.standardize_scheme_language(scheme, target_language)
            
            # Convert ObjectId to string
            if "_id" in standardized_scheme:
                standardized_scheme["_id"] = str(standardized_scheme["_id"])
            # Create Pydantic model instance
            scheme_models.append(SchemeInDB(**standardized_scheme))
                
        # Return paginated result
        if total > limit or page > 1:
            return {
                "items": scheme_models,
                "total": total,
                "page": page,
                "pages": (total + limit - 1) // limit
            }
        else:
            # For backward compatibility, return just the list if no pagination needed
            return scheme_models
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching schemes: {str(e)}")

@router.get("/stats")
async def get_schemes_stats(db = Depends(get_db)):
    """Get statistics about schemes."""
    try:
        # Total schemes count
        total_schemes = await db["schemes"].count_documents({})
        
        # Schemes by category
        category_pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        category_stats = await db["schemes"].aggregate(category_pipeline).to_list(None)
        
        # Convert to dictionary
        by_category = {stat["_id"]: stat["count"] for stat in category_stats if stat["_id"]}
        
        # Last updated
        last_updated_scheme = await db["schemes"].find_one({}, sort=[("last_updated", -1)])
        last_updated = last_updated_scheme.get("last_updated") if last_updated_scheme else None
        
        return {
            "total_schemes": total_schemes,
            "by_category": by_category,
            "last_updated": last_updated
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching scheme stats: {str(e)}")

@router.get("/category/{category}", response_model=List[SchemeInDB])
async def get_schemes_by_category(
    category: str, 
    current_user: Optional[UserOut] = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get all schemes filtered by category."""
    try:
        # Determine user's language preference
        target_language = 'english'  # Default to English
        if current_user:
            user_profile = await db.users.find_one({"email": current_user.email})
            if user_profile:
                target_language = language_service.get_language_preference(user_profile)
        
        # Valid categories
        valid_categories = ["pension", "healthcare", "housing", "disability", "education", "general"]
        
        if category not in valid_categories:
            raise HTTPException(status_code=400, detail=f"Invalid category. Valid categories: {', '.join(valid_categories)}")
        
        # Find schemes by category
        cursor = db["schemes"].find({"category": category}).sort("last_updated", ASCENDING)
        schemes = await cursor.to_list(None)
        
        # Standardize language and convert ObjectId to string
        standardized_schemes = []
        for scheme in schemes:
            # Standardize language
            standardized_scheme = await language_service.standardize_scheme_language(scheme, target_language)
            standardized_scheme["_id"] = str(standardized_scheme["_id"])
            standardized_schemes.append(standardized_scheme)
        
        return standardized_schemes
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching schemes by category: {str(e)}")

@router.get("/search", response_model=List[SchemeInDB])
async def search_schemes(
    q: str = Query(..., description="Search query for semantic search"),
    n: int = Query(5, ge=1, le=20, description="Number of results to return"),
    db = Depends(get_db)
):
    """Semantic search using ChromaDB similarity search."""
    try:
        # Perform similarity search using ChromaDB
        search_results = await similarity_search(q, n)
        
        if not search_results:
            return []
            
        # Extract MongoDB IDs from search results
        mongo_ids = []
        for result in search_results:
            mongo_id = result.get("mongo_id")
            if mongo_id and ObjectId.is_valid(mongo_id):
                mongo_ids.append(ObjectId(mongo_id))
        
        if not mongo_ids:
            return []
            
        # Fetch full scheme documents from MongoDB
        cursor = db["schemes"].find({"_id": {"$in": mongo_ids}})
        schemes = await cursor.to_list(length=len(mongo_ids))
        
        # Convert ObjectId to string and maintain search order
        ordered_schemes = []
        for search_result in search_results:
            mongo_id = search_result.get("mongo_id")
            if mongo_id:
                # Find corresponding scheme
                for scheme in schemes:
                    if str(scheme["_id"]) == mongo_id:
                        scheme_copy = scheme.copy()
                        scheme_copy["_id"] = str(scheme_copy["_id"])
                        # Add similarity score if available
                        if "score" in search_result:
                            scheme_copy["similarity_score"] = search_result["score"]
                        ordered_schemes.append(scheme_copy)
                        break
                        
        return ordered_schemes
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching schemes: {str(e)}")

@router.get("/categories", response_model=List[str])
async def get_categories(db = Depends(get_db)):
    """Return distinct category values."""
    try:
        categories = await db["schemes"].distinct("category")
        return sorted([cat for cat in categories if cat])  # Filter out empty values and sort
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching categories: {str(e)}")

@router.post("/", response_model=SchemeInDB)
async def create_scheme(scheme: SchemeCreate, db = Depends(get_db)):
    """Create a new scheme (admin endpoint)."""
    try:
        scheme_dict = scheme.model_dump()
        result = await db["schemes"].insert_one(scheme_dict)
        scheme_dict["_id"] = str(result.inserted_id)
        return scheme_dict
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating scheme: {str(e)}")

@router.get("/{id}/similar", response_model=List[SchemeInDB])
async def get_similar_schemes(id: str, db = Depends(get_db)):
    """Get schemes similar to the given scheme."""
    try:
        # Validate ObjectId format
        if not ObjectId.is_valid(id):
            raise HTTPException(status_code=400, detail="Invalid scheme ID format")
        
        # Find scheme by ID
        scheme = await db["schemes"].find_one({"_id": ObjectId(id)})
        
        if not scheme:
            raise HTTPException(status_code=404, detail="Scheme not found")
        
        # Build search query from title and description
        search_query = f"{scheme.get('title', '')} {scheme.get('description', '')}"
        
        # Perform similarity search
        search_results = await similarity_search(search_query, n=5)
        
        if not search_results:
            return []
        
        # Extract MongoDB IDs and exclude current scheme
        mongo_ids = []
        for result in search_results:
            mongo_id = result.get("mongo_id")
            if mongo_id and ObjectId.is_valid(mongo_id) and mongo_id != id:
                mongo_ids.append(ObjectId(mongo_id))
        
        if not mongo_ids:
            return []
        
        # Fetch similar schemes
        cursor = db["schemes"].find({"_id": {"$in": mongo_ids}})
        similar_schemes = await cursor.to_list(length=len(mongo_ids))
        
        # Convert ObjectId to string
        for scheme in similar_schemes:
            scheme["_id"] = str(scheme["_id"])
        
        return similar_schemes[:4]  # Return top 4
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding similar schemes: {str(e)}")

@router.get("/{id}", response_model=SchemeInDB)
async def get_scheme(id: str, db = Depends(get_db)):
    """Get a single scheme by MongoDB ObjectId."""
    try:
        # Validate ObjectId format
        if not ObjectId.is_valid(id):
            raise HTTPException(status_code=400, detail="Invalid scheme ID format")
            
        # Find scheme by ID
        scheme = await db["schemes"].find_one({"_id": ObjectId(id)})
        
        if not scheme:
            raise HTTPException(status_code=404, detail="Scheme not found")
            
        # Convert ObjectId to string
        scheme["_id"] = str(scheme["_id"])
        return scheme
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching scheme: {str(e)}")

@router.get("/{id}/explain")
async def explain_scheme(id: str, db = Depends(get_db)):
    """Get simplified explanation of a scheme."""
    try:
        # Validate ObjectId format
        if not ObjectId.is_valid(id):
            raise HTTPException(status_code=400, detail="Invalid scheme ID format")
        
        # Find scheme by ID
        scheme = await db["schemes"].find_one({"_id": ObjectId(id)})
        
        if not scheme:
            raise HTTPException(status_code=404, detail="Scheme not found")
        
        # Check if simplified explanation already exists
        if "simple_explanation" in scheme and scheme["simple_explanation"]:
            return {"simple_explanation": scheme["simple_explanation"]}
        
        # Generate simplified explanation
        simple_explanation = await simplifier.simplify_scheme(scheme)
        
        # Cache result back to MongoDB
        await db["schemes"].update_one(
            {"_id": ObjectId(id)},
            {"$set": {"simple_explanation": simple_explanation}}
        )
        
        return {"simple_explanation": simple_explanation}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error explaining scheme: {e}")
        raise HTTPException(status_code=500, detail=f"Error explaining scheme")

@router.get("/{id}/similar", response_model=List[SchemeInDB])
async def get_similar_schemes(id: str, db = Depends(get_db)):
    """Get schemes similar to the given scheme."""
    try:
        # Validate ObjectId format
        if not ObjectId.is_valid(id):
            raise HTTPException(status_code=400, detail="Invalid scheme ID format")
        
        # Find scheme by ID
        scheme = await db["schemes"].find_one({"_id": ObjectId(id)})
        
        if not scheme:
            raise HTTPException(status_code=404, detail="Scheme not found")
        
        # Build search query from title and description
        search_query = f"{scheme.get('title', '')} {scheme.get('description', '')}"
        
        # Perform similarity search
        search_results = await similarity_search(search_query, n=5)
        
        if not search_results:
            return []
        
        # Extract MongoDB IDs and exclude current scheme
        mongo_ids = []
        for result in search_results:
            mongo_id = result.get("mongo_id")
            if mongo_id and ObjectId.is_valid(mongo_id) and mongo_id != id:
                mongo_ids.append(ObjectId(mongo_id))
        
        if not mongo_ids:
            return []
        
        # Fetch similar schemes
        cursor = db["schemes"].find({"_id": {"$in": mongo_ids}})
        similar_schemes = await cursor.to_list(length=len(mongo_ids))
        
        # Convert ObjectId to string
        for scheme in similar_schemes:
            scheme["_id"] = str(scheme["_id"])
        
        return similar_schemes[:4]  # Return top 4
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding similar schemes: {str(e)}")
