from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

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