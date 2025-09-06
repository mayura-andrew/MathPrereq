from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Optional
import json
from datetime import datetime
from .models import (
    ConceptSubmissionRequest, ConceptSubmissionResponse, 
    SubmissionListResponse, ReviewSubmissionRequest
)
from ..core.submission_analyzer import SubmissionAnalyzer
from ..data.submission_storage import SubmissionStorage
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/submissions", tags=["Knowledge Graph Submissions"])

# Dependency to get submission analyzer
def get_submission_analyzer(request: Request) -> SubmissionAnalyzer:
    """Get submission analyzer with knowledge graph"""
    knowledge_graph = getattr(request.app.state, 'knowledge_graph', None)
    if not knowledge_graph:
        raise HTTPException(status_code=500, detail="Knowledge graph not available")
    return SubmissionAnalyzer(knowledge_graph)

# Dependency to get submission storage
def get_submission_storage() -> SubmissionStorage:
    """Get submission storage"""
    return SubmissionStorage()

@router.post("/submit-concept", response_model=ConceptSubmissionResponse)
async def submit_concept(
    request: ConceptSubmissionRequest,
    analyzer: SubmissionAnalyzer = Depends(get_submission_analyzer),
    storage: SubmissionStorage = Depends(get_submission_storage)
):
    """Submit a new concept for review and potential addition to knowledge graph"""
    
    try:
        logger.info(f"📝 Processing concept submission: {request.title}")
        
        # Step 1: Validate submission quality
        quality_check = await analyzer.validate_submission_quality(
            request.title, 
            request.description
        )
        
        if not quality_check.get('meets_standards', False):
            return ConceptSubmissionResponse(
                success=False,
                submission_id=None,
                message="Submission does not meet quality standards",
                feedback=quality_check.get('feedback', ''),
                suggestions=quality_check.get('weaknesses', [])
            )
        
        # Step 2: Analyze concept with LLM
        concept_analysis = await analyzer.analyze_concept_submission(
            title=request.title,
            description=request.description,
            source_material=request.source_material
        )
        
        # Step 3: Detect potential relationships
        relationships = await analyzer.detect_concept_relationships(concept_analysis)
        
        # Step 4: Store in staging area
        submission_id = await storage.store_concept_submission(
            student_id=request.student_id,
            student_name=request.student_name,
            title=request.title,
            description=request.description,
            source_material=request.source_material,
            analysis=concept_analysis,
            relationships=relationships,
            quality_check=quality_check
        )
        
        logger.info(f"✅ Stored submission {submission_id} for review")
        
        return ConceptSubmissionResponse(
            success=True,
            submission_id=submission_id,
            message="Concept submitted successfully for expert review",
            suggested_concept_name=concept_analysis.suggested_name,
            confidence_score=concept_analysis.confidence_score,
            estimated_review_time="2-3 days",
            feedback=quality_check.get('feedback', ''),
            suggestions=quality_check.get('strengths', [])
        )
        
    except Exception as e:
        logger.error(f"❌ Concept submission failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pending", response_model=SubmissionListResponse)
async def get_pending_submissions(
    reviewer_id: str,
    limit: int = 20,
    storage: SubmissionStorage = Depends(get_submission_storage)
):
    """Get pending submissions for expert review"""
    
    try:
        submissions = await storage.get_pending_submissions(limit=limit)
        
        return SubmissionListResponse(
            success=True,
            submissions=submissions,
            total_count=len(submissions),
            pending_count=sum(1 for s in submissions if s.get('status') == "pending")
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to get pending submissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/review/{submission_id}")
async def review_submission(
    submission_id: int,
    review: ReviewSubmissionRequest,
    storage: SubmissionStorage = Depends(get_submission_storage)
):
    """Expert review of a submission"""
    
    try:
        # Update submission status
        await storage.update_submission_review(
            submission_id=submission_id,
            reviewer_id=review.reviewer_id,
            decision=review.decision,
            comments=review.comments,
            modifications=review.modifications
        )
        
        # If approved, integrate into knowledge graph
        if review.decision == "approved":
            await storage.integrate_approved_submission(submission_id)
            
        return {
            "success": True,
            "message": f"Submission {review.decision} successfully",
            "next_action": "integrated_to_kg" if review.decision == "approved" else "stored_for_revision"
        }
        
    except Exception as e:
        logger.error(f"❌ Submission review failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics")
async def get_submission_statistics(
    storage: SubmissionStorage = Depends(get_submission_storage)
):
    """Get overall submission statistics"""
    
    try:
        stats = await storage.get_submission_statistics()
        return {
            "success": True,
            "statistics": stats
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/review/{submission_id}")
async def review_submission(
    submission_id: int,
    review: ReviewSubmissionRequest,
    request: Request,
    storage: SubmissionStorage = Depends(get_submission_storage)
):
    """Expert review of a submission"""
    
    try:
        # Update submission status
        await storage.update_submission_review(
            submission_id=submission_id,
            reviewer_id=review.reviewer_id,
            decision=review.decision,
            comments=review.comments,
            modifications=review.modifications
        )
        
        response_data = {
            "success": True,
            "message": f"Submission {review.decision} successfully",
            "next_action": "stored_for_revision"
        }
        
        # If approved, integrate into knowledge graph
        if review.decision == "approved":
            integration_success = await storage.integrate_approved_submission(submission_id)
            
            if integration_success:
                # Reload the knowledge graph to include new concept
                knowledge_graph = getattr(request.app.state, 'knowledge_graph', None)
                if knowledge_graph:
                    knowledge_graph.reload_from_csv()
                    logger.info("🔄 Knowledge graph reloaded after integration")
                
                response_data.update({
                    "next_action": "integrated_to_kg",
                    "integration_status": "success",
                    "message": f"Submission approved and integrated into knowledge graph successfully"
                })
            else:
                response_data.update({
                    "integration_status": "failed",
                    "message": f"Submission approved but integration failed. Manual intervention required."
                })
            
        return response_data
        
    except Exception as e:
        logger.error(f"❌ Submission review failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/integration-history")
async def get_integration_history(
    limit: int = 50,
    storage: SubmissionStorage = Depends(get_submission_storage)
):
    """Get history of concept integrations"""
    
    try:
        history = await storage.get_integration_history(limit=limit)
        return {
            "success": True,
            "history": history,
            "total_integrations": len(history)
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get integration history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/csv-integrity")
async def check_csv_integrity(
    storage: SubmissionStorage = Depends(get_submission_storage)
):
    """Check integrity of CSV files"""
    
    try:
        integrity_report = await storage.verify_csv_integrity()
        return {
            "success": True,
            "integrity_report": integrity_report
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to check CSV integrity: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/manual-reload-kg")
async def manual_reload_knowledge_graph(
    request: Request
):
    """Manually reload knowledge graph from CSV files"""
    
    try:
        knowledge_graph = getattr(request.app.state, 'knowledge_graph', None)
        if not knowledge_graph:
            raise HTTPException(status_code=500, detail="Knowledge graph not available")
        
        knowledge_graph.reload_from_csv()
        
        return {
            "success": True,
            "message": "Knowledge graph reloaded successfully",
            "nodes_count": len(knowledge_graph.graph.nodes),
            "edges_count": len(knowledge_graph.graph.edges)
        }
        
    except Exception as e:
        logger.error(f"❌ Manual KG reload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))