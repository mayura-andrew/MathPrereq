from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, Any, List
import time
import structlog
from core.config import settings

from core.llm_client import LLMClient
from .models import (
    QueryRequest, QueryResponse, ConceptDetailRequest, 
    ConceptDetailResponse, HealthResponse, LearningPath, ConceptInfo
)
from core.orchestration_engine import OrchestrationEngine

logger = structlog.get_logger()
router = APIRouter()

def get_orchestration_engine(request: Request) -> OrchestrationEngine:
    """Dependency to get orchestration engine from app state"""
    if not hasattr(request.app.state, 'knowledge_graph') or not hasattr(request.app.state, 'vector_store'):
        raise HTTPException(status_code=503, detail="Application not properly initialized")
    
    return OrchestrationEngine(
        knowledge_graph=request.app.state.knowledge_graph,
        vector_store=request.app.state.vector_store
    )

@router.post("/query", response_model=QueryResponse)
async def process_query(
    request: QueryRequest,
    engine: OrchestrationEngine = Depends(get_orchestration_engine)
):
    """
    Main endpoint for processing student queries.
    This implements the core workflow: Query -> Concept Identification -> Retrieval -> Generation
    """
    start_time = time.time()

    try:
        logger.info(f"🔍 Processing query: {request.question[:100]}...")
        # Step 1: Identify concepts from the query
        identified_concepts = await engine.identify_concepts(request.question)

        if not identified_concepts:
            logger.warning("⚠️ No concepts identified from query")
            return QueryResponse(
                success=False,
                query=request.question,
                identified_concepts=[],
                learning_path=LearningPath(concepts=[], total_concepts=0),
                explanation="I couldn't identify any mathematical concepts in your question. Could you please rephrase it or be more specific about the mathematical topic you're asking about?",
                retrieved_context=[],
                processing_time=time.time() - start_time,
                error_message="No concepts identified"
            )
        # Step 2: Find prerequisite learning path
        prerequisite_path = engine.find_prerequisite_path(identified_concepts)

        # Step 3: Retrieve relevant context using semantic search
        retrieved_context = await engine.retrieve_context(request.question)

        # Step 4: Generate explanation using LLM with RAG
        explanation = await engine.generate_explanation(
            query=request.question,
            prerequisite_path=prerequisite_path,
            context_chunks=retrieved_context
        )
    
        # Format learning path for response
        learning_path = LearningPath(
            concepts=[ConceptInfo(**concept) for concept in prerequisite_path],
            total_concepts=len(prerequisite_path),
            path_type="prerequisite_path"
        )

        processing_time = time.time() - start_time

        logger.info(f"✅ Query processed successfully in {processing_time:.2f}s")
        
        return QueryResponse(
            success=True,
            query=request.question,
            identified_concepts=identified_concepts,
            learning_path=learning_path,
            explanation=explanation,
            retrieved_context=retrieved_context,
            processing_time=processing_time
        )
    
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"❌ Query processing failed: {e}")
        
        return QueryResponse(
            success=False,
            query=request.question,
            identified_concepts=[],
            learning_path=LearningPath(concepts=[], total_concepts=0),
            explanation="I apologize, but I encountered an error while processing your question. Please try again or rephrase your question.",
            retrieved_context=[],
            processing_time=processing_time,
            error_message=str(e)
        )
    
@router.post("/concept-detail", response_model=ConceptDetailResponse)
async def get_concept_detail(
    request: ConceptDetailRequest,
    engine: OrchestrationEngine = Depends(get_orchestration_engine)
):
    """
    Get detailed information about a specific concept.
    This enables the interactive roadmap feature.
    """
    try:
        logger.info(f"🎯 Getting details for concept: {request.concept_id}")
        
        # Get concept information from knowledge graph
        concept_info = engine.knowledge_graph.get_concept_info(request.concept_id)
        
        if not concept_info:
            raise HTTPException(status_code=404, detail=f"Concept '{request.concept_id}' not found")
        
        # Get prerequisite concepts
        prerequisites = []
        for prereq_id in concept_info.get('prerequisites', []):
            prereq_info = engine.knowledge_graph.get_concept_info(prereq_id)
            if prereq_info:
                prerequisites.append(ConceptInfo(
                    id=prereq_info['id'],
                    name=prereq_info['name'],
                    description=prereq_info['description'],
                    type="prerequisite"
                ))
        
        # Get concepts this leads to
        leads_to = []
        for next_id in concept_info.get('leads_to', []):
            next_info = engine.knowledge_graph.get_concept_info(next_id)
            if next_info:
                leads_to.append(ConceptInfo(
                    id=next_info['id'],
                    name=next_info['name'],
                    description=next_info['description'],
                    type="next_concept"
                ))
        
        # Generate detailed explanation for this concept
        concept_query = f"Explain {concept_info['name']} in detail"
        retrieved_context = await engine.retrieve_context(concept_query)
        
        detailed_explanation = await engine.generate_explanation(
            query=concept_query,
            prerequisite_path=[concept_info],
            context_chunks=retrieved_context
        )
        
        return ConceptDetailResponse(
            success=True,
            concept=ConceptInfo(
                id=concept_info['id'],
                name=concept_info['name'],
                description=concept_info['description'],
                type="target"
            ),
            prerequisites=prerequisites,
            leads_to=leads_to,
            detailed_explanation=detailed_explanation
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get concept detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/concepts", response_model=List[ConceptInfo])
async def list_all_concepts(
    engine: OrchestrationEngine = Depends(get_orchestration_engine)
):
    """List all available concepts in the knowledge graph"""
    try:
        concepts = engine.knowledge_graph.get_all_concepts()
        return [ConceptInfo(**concept) for concept in concepts]
    except Exception as e:
        logger.error(f"❌ Failed to list concepts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health-detailed", response_model=HealthResponse)
async def detailed_health_check(
    engine: OrchestrationEngine = Depends(get_orchestration_engine)
):
    """Detailed health check with system statistics"""
    try:
        # Get KG stats
        all_concepts = engine.knowledge_graph.get_all_concepts()
        
        # Get vector store stats
        vector_stats = engine.vector_store.get_collection_stats()
        
        return HealthResponse(
            status="healthy",
            service="math-learning-framework",
            kg_loaded=True,
            vector_store_loaded=True,
            total_concepts=len(all_concepts),
            total_chunks=vector_stats.get("total_chunks", 0)
        )
        
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        return HealthResponse(
            status="unhealthy",
            service="math-learning-framework",
            kg_loaded=False,
            vector_store_loaded=False,
            total_concepts=0,
            total_chunks=0
        )
        
@router.get("/llm-status")
async def get_llm_status():
    """Get status of all LLM providers"""
    
    try:
        llm_client = LLMClient()
        
        status = {
            "providers": llm_client.get_available_providers(),
            "provider_status": llm_client.get_provider_status(),
            "default_model": settings.default_llm_model  # Now this will work
        }
        
        return {
            "success": True,
            "status": status
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get LLM status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-llm")
async def test_llm_providers(request: dict):
    """Test all available LLM providers"""
    
    try:
        llm_client = LLMClient()
        test_prompt = request.get("prompt", "What is 2+2? Answer in one sentence.")
        
        results = {}
        
        # Test each provider if available
        providers = llm_client.get_available_providers()
        
        for provider in providers:
            try:
                if provider == "OpenAI" and llm_client.openai_client:
                    response = await llm_client.call_llm(test_prompt, model="gpt-4o-mini")
                    results[provider] = {"success": True, "response": response}
                elif provider == "Groq" and llm_client.groq_client:
                    # Temporarily disable other providers to test Groq
                    temp_openai = llm_client.openai_client
                    llm_client.openai_client = None
                    response = await llm_client.call_llm(test_prompt)
                    llm_client.openai_client = temp_openai
                    results[provider] = {"success": True, "response": response}
                elif provider == "Gemini" and llm_client.gemini_client:
                    # Temporarily disable other providers to test Gemini
                    temp_openai = llm_client.openai_client
                    temp_groq = llm_client.groq_client
                    llm_client.openai_client = None
                    llm_client.groq_client = None
                    response = await llm_client.call_llm(test_prompt)
                    llm_client.openai_client = temp_openai
                    llm_client.groq_client = temp_groq
                    results[provider] = {"success": True, "response": response}
                    
            except Exception as e:
                results[provider] = {"success": False, "error": str(e)}
        
        return {
            "success": True,
            "test_prompt": test_prompt,
            "results": results
        }
        
    except Exception as e:
        logger.error(f"❌ LLM testing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/query-with-resources", response_model=QueryResponse)
async def process_query_with_resources(
    request: QueryRequest,
    engine: OrchestrationEngine = Depends(get_orchestration_engine)
):
    """
    Enhanced query processing that includes educational resource discovery
    """
    start_time = time.time()

    try:
        logger.info(f"🔍 Processing enhanced query: {request.question[:100]}...")
        
        # Use enhanced workflow with resources
        workflow_result = await engine.process_query_workflow_with_resources(request.question)
        
        if not workflow_result["success"]:
            return QueryResponse(
                success=False,
                query=request.question,
                identified_concepts=[],
                learning_path=LearningPath(concepts=[], total_concepts=0),
                explanation=workflow_result.get("explanation", "Failed to process query"),
                retrieved_context=[],
                processing_time=time.time() - start_time,
                error_message=workflow_result.get("error"),
                educational_resources=[]
            )
        
        # Format learning path for response
        learning_path = LearningPath(
            concepts=[ConceptInfo(**concept) for concept in workflow_result["prerequisite_path"]],
            total_concepts=len(workflow_result["prerequisite_path"]),
            path_type="prerequisite_path"
        )

        processing_time = time.time() - start_time

        logger.info(f"✅ Enhanced query processed successfully in {processing_time:.2f}s")
        
        return QueryResponse(
            success=True,
            query=request.question,
            identified_concepts=workflow_result["identified_concepts"],
            learning_path=learning_path,
            explanation=workflow_result["explanation"],
            retrieved_context=workflow_result["retrieved_context"],
            processing_time=processing_time,
            educational_resources=workflow_result["educational_resources"]
        )
    
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"❌ Enhanced query processing failed: {e}")
        
        return QueryResponse(
            success=False,
            query=request.question,
            identified_concepts=[],
            learning_path=LearningPath(concepts=[], total_concepts=0),
            explanation="I apologize, but I encountered an error while processing your question. Please try again or rephrase your question.",
            retrieved_context=[],
            processing_time=processing_time,
            error_message=str(e),
            educational_resources=[]
        )