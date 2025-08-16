"""
Auto-Growing Knowledge Graph - Concept Analyzer
Identifies missing prerequisite concepts and suggests additions to human experts
"""

import json
import csv
import logging
from typing import List, Dict, Set, Tuple, Optional
from dataclasses import dataclass
from pathlib import Path

from .llm_client import LLMClient
from data.knowledge_graph import KnowledgeGraph

logger = logging.getLogger(__name__)

@dataclass
class ConceptCandidate:
    """Represents a potential new concept for the knowledge graph"""
    concept_id: str
    concept_name: str
    description: str
    confidence_score: float
    prerequisites: List[str]
    relationships: List[Dict[str, str]]
    reason_for_addition: str
    source_query: str

@dataclass
class AnalysisResult:
    """Result of concept analysis"""
    existing_concepts: List[str]
    missing_concepts: List[ConceptCandidate]
    suggested_edges: List[Dict[str, str]]
    coverage_score: float
    analysis_summary: str

class ConceptAnalyzer:
    """Analyzes user queries to identify missing concepts in knowledge graph"""
    
    def __init__(self, llm_client: LLMClient, kg: KnowledgeGraph):
        self.llm_client = llm_client
        self.kg = kg
        self.analysis_prompt_template = self._load_analysis_prompt()
        
    def _load_analysis_prompt(self) -> str:
        """Load the concept analysis prompt template"""
        return """
You are an expert mathematics curriculum designer analyzing prerequisite knowledge for problem-solving.

TASK: Analyze the given problem/query and identify ALL prerequisite mathematical concepts needed to solve it.

CURRENT KNOWLEDGE GRAPH:
Available Concepts: {existing_concepts}
Available Relationships: {existing_relationships}

USER QUERY: {user_query}

Please provide a detailed analysis in the following JSON format:

{{
    "identified_prerequisites": [
        {{
            "concept_name": "Name of concept",
            "concept_id": "unique_identifier",
            "description": "Clear description of the concept",
            "confidence": 0.95,
            "is_fundamental": true,
            "difficulty_level": "beginner|intermediate|advanced"
        }}
    ],
    "existing_concepts_used": ["list", "of", "existing", "concept_ids"],
    "missing_concepts": [
        {{
            "concept_name": "Missing Concept Name",
            "concept_id": "suggested_id",
            "description": "Why this concept is needed",
            "confidence": 0.85,
            "prerequisites": ["prerequisite_concept_ids"],
            "reason": "Detailed explanation of why this is missing and important"
        }}
    ],
    "suggested_relationships": [
        {{
            "source_id": "concept1",
            "target_id": "concept2", 
            "relationship_type": "prerequisite_for",
            "confidence": 0.9,
            "reason": "Why this relationship exists"
        }}
    ],
    "coverage_analysis": {{
        "coverage_percentage": 75,
        "gaps_identified": ["major", "knowledge", "gaps"],
        "recommendations": "How to improve the knowledge graph"
    }}
}}

Focus on:
1. Mathematical prerequisites that students MUST know before attempting this problem
2. Concepts that are missing from the current knowledge graph
3. Relationships between concepts that aren't captured
4. Fundamental vs advanced prerequisite concepts
"""

    async def analyze_query_prerequisites(self, user_query: str) -> AnalysisResult:
        """
        Analyze a user query to identify prerequisite concepts and find gaps in knowledge graph
        """
        try:
            # Get current knowledge graph state
            existing_concepts = self._get_existing_concepts()
            existing_relationships = self._get_existing_relationships()
            
            # Prepare the analysis prompt
            prompt = self.analysis_prompt_template.format(
                existing_concepts=existing_concepts,
                existing_relationships=existing_relationships,
                user_query=user_query
            )
            
            # Get LLM analysis
            response = await self.llm_client.generate_response(
                prompt,
                max_tokens=2000,
                temperature=0.1
            )
            
            # Parse the JSON response
            analysis_data = json.loads(response)
            
            # Process the analysis results
            result = self._process_analysis_results(analysis_data, user_query)
            
            logger.info(f"Concept analysis completed. Found {len(result.missing_concepts)} missing concepts")
            
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing query prerequisites: {e}")
            raise
    
    def _get_existing_concepts(self) -> Dict[str, str]:
        """Get all existing concepts from the knowledge graph"""
        concepts = {}
        try:
            nodes_file = Path("data/raw/nodes.csv")
            if nodes_file.exists():
                with open(nodes_file, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        concepts[row['node_id']] = row['concept_name']
        except Exception as e:
            logger.error(f"Error loading existing concepts: {e}")
        
        return concepts
    
    def _get_existing_relationships(self) -> List[Dict[str, str]]:
        """Get all existing relationships from the knowledge graph"""
        relationships = []
        try:
            edges_file = Path("data/raw/edges.csv")
            if edges_file.exists():
                with open(edges_file, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        relationships.append({
                            'source': row['source_id'],
                            'target': row['target_id'],
                            'type': row['relationship_type']
                        })
        except Exception as e:
            logger.error(f"Error loading existing relationships: {e}")
        
        return relationships
    
    def _process_analysis_results(self, analysis_data: Dict, user_query: str) -> AnalysisResult:
        """Process the LLM analysis results into structured format"""
        
        # Extract missing concepts
        missing_concepts = []
        for concept_data in analysis_data.get('missing_concepts', []):
            candidate = ConceptCandidate(
                concept_id=concept_data['concept_id'],
                concept_name=concept_data['concept_name'],
                description=concept_data['description'],
                confidence_score=concept_data['confidence'],
                prerequisites=concept_data.get('prerequisites', []),
                relationships=[],  # Will be populated from suggested_relationships
                reason_for_addition=concept_data['reason'],
                source_query=user_query
            )
            missing_concepts.append(candidate)
        
        # Extract suggested relationships
        suggested_edges = analysis_data.get('suggested_relationships', [])
        
        # Calculate coverage
        coverage_score = analysis_data.get('coverage_analysis', {}).get('coverage_percentage', 0) / 100
        
        # Create analysis summary
        analysis_summary = self._create_analysis_summary(analysis_data, missing_concepts)
        
        return AnalysisResult(
            existing_concepts=analysis_data.get('existing_concepts_used', []),
            missing_concepts=missing_concepts,
            suggested_edges=suggested_edges,
            coverage_score=coverage_score,
            analysis_summary=analysis_summary
        )
    
    def _create_analysis_summary(self, analysis_data: Dict, missing_concepts: List[ConceptCandidate]) -> str:
        """Create a human-readable summary of the analysis"""
        
        coverage = analysis_data.get('coverage_analysis', {})
        coverage_pct = coverage.get('coverage_percentage', 0)
        
        summary = f"""
## Prerequisite Analysis Summary

**Query Coverage**: {coverage_pct}% of prerequisite concepts are available in the current knowledge graph.

**Missing Concepts Identified**: {len(missing_concepts)} new concepts suggested for addition.

**Key Findings**:
"""
        
        for concept in missing_concepts[:3]:  # Show top 3
            summary += f"- **{concept.concept_name}** (Confidence: {concept.confidence_score:.0%}): {concept.reason_for_addition}\n"
        
        if len(missing_concepts) > 3:
            summary += f"- ... and {len(missing_concepts) - 3} more concepts\n"
        
        gaps = coverage.get('gaps_identified', [])
        if gaps:
            summary += f"\n**Knowledge Gaps**: {', '.join(gaps)}\n"
        
        recommendations = coverage.get('recommendations', '')
        if recommendations:
            summary += f"\n**Recommendations**: {recommendations}\n"
        
        return summary
    
    async def suggest_concept_additions(self, missing_concepts: List[ConceptCandidate]) -> List[Dict]:
        """
        Format missing concepts as suggestions for human expert review
        """
        suggestions = []
        
        for concept in missing_concepts:
            suggestion = {
                'id': len(suggestions) + 1,
                'concept_id': concept.concept_id,
                'concept_name': concept.concept_name,
                'description': concept.description,
                'confidence_score': concept.confidence_score,
                'prerequisites': concept.prerequisites,
                'reason': concept.reason_for_addition,
                'source_query': concept.source_query,
                'status': 'pending_review',
                'suggested_at': self._get_current_timestamp(),
                'priority': self._calculate_priority(concept)
            }
            suggestions.append(suggestion)
        
        return suggestions
    
    def _calculate_priority(self, concept: ConceptCandidate) -> str:
        """Calculate priority level for concept addition"""
        if concept.confidence_score >= 0.9:
            return 'high'
        elif concept.confidence_score >= 0.7:
            return 'medium'
        else:
            return 'low'
    
    def _get_current_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()

    async def validate_concept_integration(self, concept: ConceptCandidate) -> Dict[str, any]:
        """
        Validate how well a new concept would integrate into the existing knowledge graph
        """
        existing_concepts = self._get_existing_concepts()
        
        # Check for potential conflicts
        conflicts = []
        if concept.concept_id in existing_concepts:
            conflicts.append(f"Concept ID '{concept.concept_id}' already exists")
        
        # Check prerequisite validity
        invalid_prerequisites = []
        for prereq in concept.prerequisites:
            if prereq not in existing_concepts:
                invalid_prerequisites.append(prereq)
        
        # Calculate integration score
        integration_score = self._calculate_integration_score(concept, existing_concepts)
        
        return {
            'is_valid': len(conflicts) == 0 and len(invalid_prerequisites) == 0,
            'conflicts': conflicts,
            'invalid_prerequisites': invalid_prerequisites,
            'integration_score': integration_score,
            'recommendations': self._get_integration_recommendations(concept, existing_concepts)
        }
    
    def _calculate_integration_score(self, concept: ConceptCandidate, existing_concepts: Dict[str, str]) -> float:
        """Calculate how well the concept integrates with existing knowledge"""
        score = 0.5  # Base score
        
        # Bonus for having valid prerequisites
        valid_prereqs = sum(1 for p in concept.prerequisites if p in existing_concepts)
        if concept.prerequisites:
            score += 0.3 * (valid_prereqs / len(concept.prerequisites))
        
        # Bonus for high confidence
        score += 0.2 * concept.confidence_score
        
        return min(score, 1.0)
    
    def _get_integration_recommendations(self, concept: ConceptCandidate, existing_concepts: Dict[str, str]) -> List[str]:
        """Get recommendations for integrating the concept"""
        recommendations = []
        
        if concept.confidence_score < 0.7:
            recommendations.append("Consider gathering more evidence before adding this concept")
        
        missing_prereqs = [p for p in concept.prerequisites if p not in existing_concepts]
        if missing_prereqs:
            recommendations.append(f"Add missing prerequisites first: {', '.join(missing_prereqs)}")
        
        if not concept.prerequisites:
            recommendations.append("Consider identifying prerequisite relationships for this concept")
        
        return recommendations

    async def handle_missing_concepts(self, missing_concept_names: List[str], source_query: str):
        """Automatically generate suggestions for missing concepts"""
        from data.submission_storage import SubmissionStorage
        
        storage = SubmissionStorage()
        
        for concept_name in missing_concept_names:
            logger.info(f"🔍 Generating suggestion for missing concept: {concept_name}")
            
            try:
                # Generate detailed analysis for missing concept
                suggestion = await self._analyze_missing_concept(concept_name, source_query)
                
                # Store in database for expert review
                suggestion_id = await storage.store_concept_suggestion(
                    concept_data=suggestion,
                    source_query=source_query,
                    confidence=suggestion.get('confidence_score', 0.8)
                )
                
                logger.info(f"💡 Generated suggestion #{suggestion_id} for '{concept_name}' - awaiting expert review")
                
            except Exception as e:
                logger.error(f"❌ Failed to generate suggestion for '{concept_name}': {e}")

    async def _analyze_missing_concept(self, concept_name: str, source_query: str) -> Dict:
        """Use LLM to analyze what a missing concept should contain"""
        
        existing_concepts = self._get_existing_concepts()
        
        prompt = f"""
A student asked: "{source_query}"

The system identified a missing concept: "{concept_name}"

Current knowledge graph has these concepts: {list(existing_concepts.values())[:10]}

Please provide a detailed analysis for adding this concept to a mathematics knowledge graph:

{{
    "concept_name": "{concept_name}",
    "concept_id": "suggested_node_id",
    "description": "Clear 1-2 sentence description suitable for students",
    "prerequisites": ["list", "of", "prerequisite", "concept_ids"],
    "leads_to": ["concepts", "this", "enables"],
    "difficulty_level": "beginner|intermediate|advanced", 
    "confidence_score": 0.95,
    "integration_priority": "high|medium|low",
    "reasoning": "Why this concept is essential and how it fits in the curriculum"
}}

Rules:
1. Use concept_ids that exist in the current knowledge graph for prerequisites
2. Make the concept_id lowercase with underscores (e.g., "product_rule")
3. Ensure the description is educational and clear
4. Focus on how this fits into calculus curriculum
"""
        
        try:
            response = await self.llm_client.call_llm(prompt, temperature=0.2)
            
            # Clean up the response and parse JSON
            response_clean = response.strip()
            if response_clean.startswith('```json'):
                response_clean = response_clean[7:-3]
            elif response_clean.startswith('```'):
                response_clean = response_clean[3:-3]
            
            concept_data = json.loads(response_clean)
            
            # Add metadata
            concept_data.update({
                'source_query': source_query,
                'identified_by': 'auto_concept_analyzer',
                'suggested_at': self._get_current_timestamp(),
                'status': 'pending_review'
            })
            
            return concept_data
            
        except Exception as e:
            logger.error(f"❌ Failed to analyze missing concept '{concept_name}': {e}")
            # Fallback suggestion
            return {
                'concept_name': concept_name,
                'concept_id': concept_name.lower().replace(' ', '_').replace('-', '_'),
                'description': f"Mathematical concept: {concept_name}",
                'prerequisites': [],
                'leads_to': [],
                'difficulty_level': 'intermediate',
                'confidence_score': 0.5,
                'integration_priority': 'medium',
                'reasoning': f"Identified as necessary for: {source_query}",
                'source_query': source_query,
                'status': 'pending_review'
            }
