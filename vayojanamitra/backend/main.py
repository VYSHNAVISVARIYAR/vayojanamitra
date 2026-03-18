from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from db.mongo import get_db
from config import settings

# ── Import ALL routers ──
from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.scheme_router import router as schemes_router
from routers.chatbot import router as chat_router
from routers.recommendations import router as recommendations_router
from routers.alerts import router as alerts_router
from routers.search import router as search_router
from routers.admin import router as admin_router
from routers.deadline_calendar import router as deadline_calendar_router
from routers.application import router as application_router
from routers.documents import router as documents_router

try:
    from routers.agent import router as agent_router
    HAS_AGENT = True
except ImportError:
    HAS_AGENT = False

# ── Scheduler setup ──
scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    from scraper.scraper import scrape_schemes
    from agents.proactive_agent import ProactiveAgent
    from agents.deadline_agent import get_deadline_agent
    from db.mongo import connect_to_mongo, get_db

    # MongoDB connection and indexing is handled in connect_to_mongo
    await connect_to_mongo()
    db = get_db()

    scheduler.add_job(scrape_schemes, 'interval', hours=12, id='scraper')

    proactive = ProactiveAgent(db)
    scheduler.add_job(
        proactive.run_daily_checks,
        'interval',
        hours=24,
        id='proactive_agent'
    )

    # Add deadline agent for daily checks
    deadline_agent = await get_deadline_agent(db)
    scheduler.add_job(
        deadline_agent.run_daily_checks,
        'interval',
        hours=24,
        id='deadline_agent'
    )

    scheduler.start()
    print("✅ Scheduler started")
    yield

    # Shutdown
    from db.mongo import close_mongo_connection
    scheduler.shutdown()
    await close_mongo_connection()
    print("🛑 Scheduler stopped and DB closed")

# ── App init ──
app = FastAPI(
    title="Vayojanamitra API",
    description="Agentic AI Citizens Service Assistant for Elderly People",
    version="1.0.0",
    lifespan=lifespan
)

# ── CORS — must be before routers ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount routers ──
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(schemes_router)
app.include_router(chat_router)
app.include_router(recommendations_router)
app.include_router(alerts_router)
app.include_router(search_router)
app.include_router(admin_router)
app.include_router(deadline_calendar_router)
app.include_router(application_router)
app.include_router(documents_router)

# Optional routers — only mount if file exists
if HAS_AGENT:
    app.include_router(agent_router)

# ── Health check ──
@app.get("/health")
async def health():
    return {"status": "ok", "app": "Vayojanamitra"}

# ── Admin triggers ──
@app.post("/admin/scrape-now")
async def trigger_scrape():
    from scraper.scraper import scrape_schemes
    await scrape_schemes()
    return {"message": "Scraping completed"}

@app.post("/admin/run-proactive-agent")
async def trigger_proactive():
    from agents.proactive_agent import ProactiveAgent
    from db.mongo import get_db
    db = get_db()  # No await needed
    agent = ProactiveAgent(db)
    await agent.run_daily_checks()
    return {"message": "Proactive agent completed"}

# ── LLM Stats endpoint ──
@app.get("/admin/llm-stats")
async def llm_stats():
    from utils.llm_rotator import llm_rotator
    return llm_rotator.get_stats()

# ── User Stats endpoint ──
@app.get("/admin/user-stats")
async def user_stats(db=Depends(get_db)):
    total = await db.users.count_documents({})
    complete = await db.users.count_documents(
        {"is_profile_complete": True}
    )
    return {
        "total": total,
        "profile_complete": complete,
        "profile_incomplete": total - complete
    }

# ── Test LLM endpoint ──
@app.post("/admin/test-llm")
async def test_llm():
    from utils.llm_rotator import llm_rotator
    result = await llm_rotator.call(
        "Say 'LLM working!' in one word",
        max_tokens=10
    )
    return {
        "status": "ok" if result else "failed",
        "response": result,
        "stats": llm_rotator.get_stats()
    }

# ── Re-index ChromaDB endpoint ──
@app.post("/admin/reindex-chroma")
async def reindex_chroma(db=Depends(get_db)):
    from db.chroma import chroma_client
    schemes = await db.schemes.find(
        {"is_active": True}
    ).to_list(None)
    
    # Clear existing collection
    chroma_client.clear_collection()
    
    # Re-index all schemes
    for scheme in schemes:
        text = (
            f"{scheme.get('title','')} "
            f"{scheme.get('description','')} "
            f"{scheme.get('eligibility','')}"
        )
        chroma_client.add_scheme(
            str(scheme["_id"]),
            scheme.get("title",""),
            text,
            scheme.get("category","")
        )
    
    return {
        "message": f"Re-indexed {len(schemes)} schemes"
    }

# ── Schemes Count endpoint ──
@app.get("/schemes/count")
async def get_schemes_count(db=Depends(get_db)):
    """Get total schemes count and breakdown by category."""
    try:
        # Total schemes
        total = await db.schemes.count_documents({"is_active": True})
        
        # Schemes by category
        pipeline = [
            {"$match": {"is_active": True}},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        category_counts = {}
        async for doc in db.schemes.aggregate(pipeline):
            category_counts[doc["_id"]] = doc["count"]
        
        return {
            "total": total,
            "by_category": category_counts
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting schemes count: {str(e)}")
