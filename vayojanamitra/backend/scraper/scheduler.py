import asyncio
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from scraper.scraper import scrape_schemes

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = BackgroundScheduler()

def run_scraper_async():
    """Wrapper to run async scraper function."""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(scrape_schemes())
        loop.close()
        logger.info("Scheduled scraping completed successfully")
    except Exception as e:
        logger.error(f"Error during scheduled scraping: {e}")

def start_scheduler():
    """Start the APScheduler with 12-hour interval (2 times daily)."""
    try:
        # Schedule scraper to run every 12 hours (2 times daily)
        scheduler.add_job(
            func=run_scraper_async,
            trigger=IntervalTrigger(hours=12),
            id='scraper_job',
            name='Periodic scheme scraping (2x daily)',
            replace_existing=True
        )
        
        scheduler.start()
        logger.info("Scheduler started - will run scraper every 12 hours (2 times daily)")
        
    except Exception as e:
        logger.error(f"Error starting scheduler: {e}")

def stop_scheduler():
    """Stop the APScheduler."""
    try:
        scheduler.shutdown()
        logger.info("Scheduler stopped")
    except Exception as e:
        logger.error(f"Error stopping scheduler: {e}")

def trigger_manual_scrape():
    """Manually trigger the scraper job."""
    try:
        scheduler.add_job(
            func=run_scraper_async,
            trigger='date',
            id=f'manual_scrape_{asyncio.get_event_loop().time()}',
            name='Manual scheme scraping'
        )
        logger.info("Manual scraping triggered")
        return True
    except Exception as e:
        logger.error(f"Error triggering manual scrape: {e}")
        return False

def get_scheduler_status():
    """Get current scheduler status and jobs."""
    try:
        jobs = scheduler.get_jobs()
        return {
            "status": "running" if scheduler.running else "stopped",
            "jobs": [
                {
                    "id": job.id,
                    "name": job.name,
                    "next_run": job.next_run_time.isoformat() if job.next_run_time else None
                }
                for job in jobs
            ]
        }
    except Exception as e:
        logger.error(f"Error getting scheduler status: {e}")
        return {"status": "error", "message": str(e)}
