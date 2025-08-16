from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum

class QueryRequest(BaseModel):
    question: str = Field(..., description="Student's mathematical question")
    context: Optional[str] = Field(None, description="Additional context about student's background")

class ConceptInfo(BaseModel):
    id: str
    name: str
    description: str
    type: str = "concept" 

class LearningPath(BaseModel):
    concepts: List[ConceptInfo]
    total_concepts: int
    path_type: str = "prerequisite_path"

class QueryResponse(BaseModel):
    success: bool
    query: str
    identified_concepts: List[str]
    learning_path: LearningPath
    explanation: str
    retrieved_context: List[str]
    processing_time: float
    error_message: Optional[str] = None

class ConceptDetailRequest(BaseModel):
    concept_id: str = Field(..., description="ID of the concept to explore")

class ConceptDetailResponse(BaseModel):
    success: bool
    concept: Optional[ConceptInfo]
    prerequisites: List[ConceptInfo]
    leads_to: List[ConceptInfo]
    detailed_explanation: str
    error_message: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    service: str
    kg_loaded: bool
    vector_store_loaded: bool
    total_concepts: int
    total_chunks: int
    
class SubmissionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_REVISION = "needs_revision"

class ConceptSubmissionRequest(BaseModel):
    student_id: Optional[str] = Field(None, description="Student identifier (optional)")
    student_name: Optional[str] = Field(None, description="Student name (optional)")
    title: str = Field(..., description="Concept title")
    description: str = Field(..., description="Detailed concept description")
    source_material: Optional[str] = Field(None, description="Source reference")

class ConceptSubmissionResponse(BaseModel):
    success: bool
    submission_id: Optional[int] = None
    message: str
    suggested_concept_name: Optional[str] = None
    confidence_score: Optional[int] = None
    estimated_review_time: Optional[str] = None
    feedback: Optional[str] = None
    suggestions: List[str] = []

class SubmissionListResponse(BaseModel):
    success: bool
    submissions: List[Dict[str, Any]]
    total_count: int
    pending_count: int

class ReviewSubmissionRequest(BaseModel):
    reviewer_id: str = Field(..., description="Reviewer identifier")
    decision: str = Field(..., description="approve/reject/needs_revision")
    comments: str = Field(..., description="Review comments")
    modifications: Optional[Dict[str, Any]] = Field(None, description="Suggested modifications")