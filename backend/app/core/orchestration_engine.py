from typing import List, Dict, Any
import structlog
from .llm_client import LLMClient
from data.knowledge_graph import KnowledgeGraph
from data.vector_store import VectorStore

logger = structlog.get_logger()

class OrchestrationEngine:
    """
    The main orchestration engine that coordinates all components:
    LLM, Knowledge Graph, and Vector Store to process student queries.
    """

    def __init__(self, knowledge_graph: KnowledgeGraph, vector_store: VectorStore):
        self.knowledge_graph = knowledge_graph
        self.vector_store = vector_store
        self.llm_client = LLMClient()

    async def identify_concepts(self, query: str) -> List[str]:
        """Step 1: Use LLM to identify mathematical concepts from query"""
        try:
            # Get concepts identified by LLM
            identified_concepts = await self.llm_client.identify_concepts(query)
            
            # Check which concepts exist in knowledge graph vs missing
            existing_concepts = []
            missing_concepts = []
            
            for concept in identified_concepts:
                concept_id = self.knowledge_graph.find_concept_id(concept)
                if concept_id:
                    existing_concepts.append(concept)
                    logger.info(f"✅ Found concept in KG: {concept}")
                else:
                    missing_concepts.append(concept)
                    logger.warning(f"⚠️ Concept not found in KG: {concept}")
            
            # Auto-generate suggestions for missing concepts
            if missing_concepts:
                logger.info(f"🤖 Auto-generating suggestions for {len(missing_concepts)} missing concepts")
                
                # Initialize concept analyzer if not exists
                if not hasattr(self, 'concept_analyzer'):
                    from .concept_analyzer import ConceptAnalyzer
                    self.concept_analyzer = ConceptAnalyzer(self.llm_client, self.knowledge_graph)
                
                # Generate suggestions in background (don't wait for completion)
                try:
                    await self.concept_analyzer.handle_missing_concepts(missing_concepts, query)
                except Exception as e:
                    logger.error(f"❌ Failed to generate concept suggestions: {e}")
            
            # Return existing concepts for now (suggestions will be reviewed separately)
            return existing_concepts
            
        except Exception as e:
            logger.error(f"❌ Concept identification failed: {e}")
            return []
    
    def find_prerequisite_path(self, concepts: List[str]) -> List[Dict]:
        """Step 2: Use Knowledge Graph to find prerequisite learning path"""
        try:
            return self.knowledge_graph.find_prerequisite_path(concepts)
        except Exception as e:
            logger.error(f"❌ Prerequisite path finding failed: {e}")
            return []
    
    async def retrieve_context(self, query: str, n_results: int = 3) -> List[str]:
        """Step 3: Use Vector Store to retrieve relevant context via semantic search"""
        try:
            return await self.vector_store.semantic_search(query, n_results)
        except Exception as e:
            logger.error(f"❌ Context retrieval failed: {e}")
            return []
    
    async def generate_explanation(
        self, 
        query: str, 
        prerequisite_path: List[Dict], 
        context_chunks: List[str]
    ) -> str:
        """Step 4: Use LLM with RAG to generate educational explanation"""
        try:
            return await self.llm_client.generate_explanation(
                query, prerequisite_path, context_chunks
            )
        except Exception as e:
            logger.error(f"❌ Explanation generation failed: {e}")
            return "I apologize, but I'm having trouble generating an explanation right now. Please try again."
    
    async def process_query_workflow(self, query: str) -> Dict[str, Any]:
            
            """
            Complete workflow: Query -> Concepts -> Prerequisites -> Context -> Explanation
            This is the main method that implements the entire system workflow.
            """

            result = {

                "success": False,
                "query": query,
                "identified_concepts": [],
                "prerequisite_path": [],
                "retrieved_context": [],
                "explanation": "",
                "error": None
            }
        
            try:
                # Phase 1: Concept Identification
                logger.info("🔍 Phase 1: Identifying concepts...")
                identified_concepts = await self.identify_concepts(query)
                result["identified_concepts"] = identified_concepts
                    
                if not identified_concepts:
                    result["explanation"] = "I couldn't identify any mathematical concepts in your question. Could you please be more specific?"
                    return result
                
                # Phase 2: Prerequisite Path Finding
                logger.info("🗺️ Phase 2: Finding prerequisite path...")
                prerequisite_path = self.find_prerequisite_path(identified_concepts)
                result["prerequisite_path"] = prerequisite_path
                    
                # Phase 3: Context Retrieval
                logger.info("📚 Phase 3: Retrieving relevant context...")
                retrieved_context = await self.retrieve_context(query)
                result["retrieved_context"] = retrieved_context
                
                # Phase 4: Explanation Generation
                logger.info("🤖 Phase 4: Generating explanation...")
                explanation = await self.generate_explanation(
                        query, prerequisite_path, retrieved_context
                    )
                result["explanation"] = explanation
                    
                result["success"] = True
                logger.info("✅ Query workflow completed successfully")
                
            except Exception as e:
                    logger.error(f"❌ Query workflow failed: {e}")
                    result["error"] = str(e)
                    result["explanation"] = "I encountered an error while processing your question. Please try again."
            
            return result