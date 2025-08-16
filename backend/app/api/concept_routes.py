"""
API routes for auto-growing knowledge graph functionality
Handles concept analysis, missing concept identification, and expert suggestions
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional
import logging

from core.concept_analyzer import ConceptAnalyzer, ConceptCandidate, AnalysisResult
from core.llm_client import LLMClient
from data.knowledge_graph import KnowledgeGraph
from data.submission_storage import SubmissionStorage

logger = logging.getLogger(__name__)

router = APIRouter()

# Request/Response Models
class ConceptAnalysisRequest(BaseModel):
    query: str
    include_suggestions: bool = True
    confidence_threshold: float = 0.7

class ConceptSuggestion(BaseModel):
    id: int
    concept_id: str
    concept_name: str
    description: str
    confidence_score: float
    prerequisites: List[str]
    reason: str
    source_query: str
    status: str
    suggested_at: str
    priority: str

class ConceptAnalysisResponse(BaseModel):
    query: str
    existing_concepts: List[str]
    missing_concepts: List[ConceptSuggestion]
    suggested_edges: List[Dict[str, str]]
    coverage_score: float
    analysis_summary: str
    suggestions_count: int

class ExpertReviewRequest(BaseModel):
    action: str  # 'approve', 'reject', 'modify'
    feedback: Optional[str] = None
    modifications: Optional[Dict] = None

class ExpertReviewResponse(BaseModel):
    success: bool
    message: str
    updated_suggestion: Optional[ConceptSuggestion] = None

# Global instances (in production, use dependency injection)
llm_client = None
kg = None
concept_analyzer = None
submission_storage = None

def get_concept_analyzer():
    """Dependency to get concept analyzer instance"""
    global concept_analyzer, llm_client, kg
    if concept_analyzer is None:
        if llm_client is None:
            llm_client = LLMClient()
        if kg is None:
            # Initialize KnowledgeGraph with proper file paths
            kg = KnowledgeGraph(
                node_file="data/raw/nodes.csv",
                edges_file="data/raw/edges.csv"
            )
        concept_analyzer = ConceptAnalyzer(llm_client, kg)
    return concept_analyzer

def get_submission_storage():
    """Dependency to get submission storage instance"""
    global submission_storage
    if submission_storage is None:
        submission_storage = SubmissionStorage()
    return submission_storage

@router.post("/analyze-prerequisites", response_model=ConceptAnalysisResponse)
async def analyze_prerequisites(
    request: ConceptAnalysisRequest,
    analyzer: ConceptAnalyzer = Depends(get_concept_analyzer)
):
    """
    Analyze a user query to identify prerequisite concepts and missing knowledge
    """
    try:
        logger.info(f"Analyzing prerequisites for query: {request.query[:100]}...")
        
        # Perform concept analysis
        analysis_result = await analyzer.analyze_query_prerequisites(request.query)
        
        # Filter missing concepts by confidence threshold
        filtered_concepts = [
            concept for concept in analysis_result.missing_concepts
            if concept.confidence_score >= request.confidence_threshold
        ]
        
        # Generate suggestions if requested
        suggestions = []
        if request.include_suggestions and filtered_concepts:
            suggestions = await analyzer.suggest_concept_additions(filtered_concepts)
        
        # Convert to response format
        suggestion_models = [
            ConceptSuggestion(**suggestion) for suggestion in suggestions
        ]
        
        response = ConceptAnalysisResponse(
            query=request.query,
            existing_concepts=analysis_result.existing_concepts,
            missing_concepts=suggestion_models,
            suggested_edges=analysis_result.suggested_edges,
            coverage_score=analysis_result.coverage_score,
            analysis_summary=analysis_result.analysis_summary,
            suggestions_count=len(suggestion_models)
        )
        
        logger.info(f"Analysis completed. Found {len(suggestion_models)} missing concepts")
        return response
        
    except Exception as e:
        logger.error(f"Error analyzing prerequisites: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/concept-suggestions", response_model=List[ConceptSuggestion])
async def get_concept_suggestions(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 50,
    storage: SubmissionStorage = Depends(get_submission_storage)
):
    """
    Get pending concept suggestions for expert review
    """
    try:
        # In a real implementation, this would query the database
        # For now, return example suggestions
        suggestions = [
            {
                "id": 1,
                "concept_id": "partial_derivatives",
                "concept_name": "Partial Derivatives",
                "description": "Derivatives of multivariable functions with respect to one variable",
                "confidence_score": 0.92,
                "prerequisites": ["derivatives", "multivariable_functions"],
                "reason": "Required for optimization problems in multiple variables",
                "source_query": "How to find maximum of f(x,y) = x²y - xy²?",
                "status": "pending_review",
                "suggested_at": "2025-08-16T10:30:00",
                "priority": "high"
            },
            {
                "id": 2,
                "concept_id": "lagrange_multipliers",
                "concept_name": "Lagrange Multipliers",
                "description": "Method for finding extrema subject to constraints",
                "confidence_score": 0.85,
                "prerequisites": ["partial_derivatives", "gradients"],
                "reason": "Essential for constrained optimization problems",
                "source_query": "Optimize f(x,y) subject to g(x,y) = 0",
                "status": "pending_review",
                "suggested_at": "2025-08-16T10:35:00",
                "priority": "medium"
            }
        ]
        
        # Filter by status and priority if specified
        if status:
            suggestions = [s for s in suggestions if s["status"] == status]
        if priority:
            suggestions = [s for s in suggestions if s["priority"] == priority]
        
        # Limit results
        suggestions = suggestions[:limit]
        
        return [ConceptSuggestion(**suggestion) for suggestion in suggestions]
        
    except Exception as e:
        logger.error(f"Error getting concept suggestions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get suggestions: {str(e)}")

@router.post("/expert-review/{suggestion_id}", response_model=ExpertReviewResponse)
async def expert_review_concept(
    suggestion_id: int,
    review: ExpertReviewRequest,
    analyzer: ConceptAnalyzer = Depends(get_concept_analyzer),
    storage: SubmissionStorage = Depends(get_submission_storage)
):
    """
    Expert review and decision on concept suggestions
    """
    try:
        logger.info(f"Expert reviewing suggestion {suggestion_id} with action: {review.action}")
        
        if review.action == "approve":
            # Validate and add concept to knowledge graph
            success = await _approve_concept(suggestion_id, analyzer, storage)
            message = "Concept approved and added to knowledge graph" if success else "Failed to add concept"
            
        elif review.action == "reject":
            # Mark as rejected with feedback
            success = await _reject_concept(suggestion_id, review.feedback, storage)
            message = "Concept suggestion rejected" if success else "Failed to reject concept"
            
        elif review.action == "modify":
            # Update suggestion with modifications
            success = await _modify_concept(suggestion_id, review.modifications, storage)
            message = "Concept suggestion modified" if success else "Failed to modify concept"
            
        else:
            raise ValueError(f"Invalid action: {review.action}")
        
        return ExpertReviewResponse(
            success=success,
            message=message
        )
        
    except Exception as e:
        logger.error(f"Error in expert review: {e}")
        raise HTTPException(status_code=500, detail=f"Review failed: {str(e)}")

@router.get("/knowledge-graph-stats")
async def get_knowledge_graph_stats(
    analyzer: ConceptAnalyzer = Depends(get_concept_analyzer)
):
    """
    Get statistics about the current knowledge graph and pending suggestions
    """
    try:
        # Get current KG stats from the analyzer's knowledge graph
        existing_concepts = analyzer._get_existing_concepts()
        existing_relationships = analyzer._get_existing_relationships()
        
        # Mock pending suggestions count (in real implementation, query database)
        pending_suggestions = 2
        
        stats = {
            "total_concepts": len(existing_concepts),
            "total_relationships": len(existing_relationships),
            "pending_suggestions": pending_suggestions,
            "coverage_areas": [
                "Basic Functions", "Limits", "Derivatives", "Integration"
            ],
            "recent_additions": [
                {"concept": "Implicit Differentiation", "added_at": "2025-08-16"}
            ]
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting KG stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

# Helper functions for expert review actions

async def _approve_concept(suggestion_id: int, analyzer: ConceptAnalyzer, storage: SubmissionStorage) -> bool:
    """Approve and add concept to knowledge graph"""
    try:
        # In real implementation:
        # 1. Get suggestion details from database
        # 2. Validate concept integration
        # 3. Add to nodes.csv and edges.csv
        # 4. Update suggestion status
        logger.info(f"Approved concept suggestion {suggestion_id}")
        return True
    except Exception as e:
        logger.error(f"Error approving concept: {e}")
        return False

async def _reject_concept(suggestion_id: int, feedback: Optional[str], storage: SubmissionStorage) -> bool:
    """Reject concept suggestion with feedback"""
    try:
        # In real implementation:
        # 1. Update suggestion status to 'rejected'
        # 2. Store expert feedback
        # 3. Log decision for future reference
        logger.info(f"Rejected concept suggestion {suggestion_id}: {feedback}")
        return True
    except Exception as e:
        logger.error(f"Error rejecting concept: {e}")
        return False

async def _modify_concept(suggestion_id: int, modifications: Optional[Dict], storage: SubmissionStorage) -> bool:
    """Modify concept suggestion based on expert input"""
    try:
        # In real implementation:
        # 1. Update suggestion with modifications
        # 2. Reset status to 'pending_review' or 'modified'
        # 3. Notify of changes
        logger.info(f"Modified concept suggestion {suggestion_id}: {modifications}")
        return True
    except Exception as e:
        logger.error(f"Error modifying concept: {e}")
        return False
