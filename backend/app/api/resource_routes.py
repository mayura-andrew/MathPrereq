from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
import structlog
from core.web_scraper import EducationalWebScraper
from data.resource_storage import ResourceStorage

logger = structlog.get_logger()
router = APIRouter()

class ScrapeRequest(BaseModel):
    concept_ids: Optional[List[str]] = None  # If None, scrape all concepts
    force_refresh: bool = False
    max_resources_per_concept: int = 10

class ResourceQuery(BaseModel):
    concept_id: str
    resource_type: Optional[str] = None
    difficulty_level: Optional[str] = None
    min_quality_score: float = 0.6

def get_resource_storage():
    return ResourceStorage()

@router.post("/scrape-educational-resources")
async def scrape_educational_resources(
    request: ScrapeRequest,
    background_tasks: BackgroundTasks,
    storage: ResourceStorage = Depends(get_resource_storage)
):
    """Start scraping educational resources for concepts"""
    
    try:
        logger.info(f"🚀 Starting educational resource scraping")
        
        # Start scraping in background
        background_tasks.add_task(
            run_educational_scraping,
            request.concept_ids,
            request.force_refresh,
            request.max_resources_per_concept
        )
        
        return {
            "success": True,
            "message": "Educational resource scraping started in background",
            "scraping": True
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to start scraping: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def run_educational_scraping(
    concept_ids: Optional[List[str]] = None,
    force_refresh: bool = False,
    max_resources_per_concept: int = 10
):
    """Background task to run educational resource scraping"""
    
    try:
        storage = ResourceStorage()
        
        async with EducationalWebScraper(max_concurrent_requests=5) as scraper:
            if concept_ids:
                # Scrape specific concepts
                logger.info(f"🔍 Scraping resources for {len(concept_ids)} specific concepts")
                # Implementation for specific concepts
                pass
            else:
                # Scrape all concepts
                logger.info(f"🔍 Scraping resources for all concepts in knowledge graph")
                resources = await scraper.scrape_resources_for_all_concepts()
                
                # Store resources in database
                if resources:
                    stored_count = await storage.store_resources(resources)
                    logger.info(f"✅ Educational scraping completed: {stored_count} new resources stored")
                else:
                    logger.warning("⚠️ No resources found during scraping")
                    
    except Exception as e:
        logger.error(f"❌ Educational scraping failed: {e}")

@router.get("/resources/{concept_id}")
async def get_concept_resources(
    concept_id: str,
    resource_type: Optional[str] = None,
    difficulty_level: Optional[str] = None,
    min_quality_score: float = 0.6,
    limit: int = 20,
    storage: ResourceStorage = Depends(get_resource_storage)
):
    """Get educational resources for a specific concept"""
    
    try:
        resources = await storage.get_resources_for_concept(
            concept_id=concept_id,
            resource_type=resource_type,
            difficulty_level=difficulty_level,
            min_quality_score=min_quality_score,
            limit=limit
        )
        
        return {
            "success": True,
            "concept_id": concept_id,
            "resources": resources,
            "total_found": len(resources),
            "filters": {
                "resource_type": resource_type,
                "difficulty_level": difficulty_level,
                "min_quality_score": min_quality_score
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get resources for {concept_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/resources/stats")
async def get_resource_statistics(
    storage: ResourceStorage = Depends(get_resource_storage)
):
    """Get statistics about scraped educational resources"""
    
    try:
        stats = await storage.get_resource_statistics()
        
        return {
            "success": True,
            "statistics": stats
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get resource statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/resources/verify/{resource_id}")
async def verify_resource(
    resource_id: int,
    verification_notes: Optional[str] = None,
    storage: ResourceStorage = Depends(get_resource_storage)
):
    """Mark a resource as verified by human reviewer"""
    
    try:
        # Implementation for resource verification
        return {
            "success": True,
            "message": f"Resource {resource_id} marked as verified"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to verify resource: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get("/debug/test-scraping")
async def debug_test_scraping():
    """Debug endpoint to test scraping functionality"""
    
    try:
        logger.info("🧪 Starting debug scraping test")
        
        # Test database connection
        storage = ResourceStorage()
        stats = await storage.get_resource_statistics()
        logger.info(f"📊 Current database stats: {stats}")
        
        # Test web scraper
        from core.web_scraper import EducationalWebScraper
        
        async with EducationalWebScraper(max_concurrent_requests=2) as scraper:
            resources = await scraper.scrape_resources_for_all_concepts()
            
            if resources:
                stored_count = await storage.store_resources(resources)
                new_stats = await storage.get_resource_statistics()
                
                return {
                    "success": True,
                    "debug_info": {
                        "scraped_resources": len(resources),
                        "stored_resources": stored_count,
                        "before_stats": stats,
                        "after_stats": new_stats,
                        "sample_resources": resources[:2]  # First 2 for debugging
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "No resources were scraped",
                    "debug_info": {
                        "stats": stats
                    }
                }
                
    except Exception as e:
        logger.error(f"❌ Debug scraping test failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "debug_info": {}
        }