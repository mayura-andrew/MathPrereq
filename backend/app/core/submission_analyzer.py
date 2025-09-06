import json
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import structlog
from .llm_client import LLMClient

logger = structlog.get_logger()

@dataclass
class ConceptAnalysis:
    suggested_id: str
    suggested_name: str
    description: str
    prerequisites: List[str]
    leads_to: List[str]
    confidence_score: int
    difficulty_level: str
    reasoning: str

@dataclass
class RelationshipAnalysis:
    source_concept: str
    target_concept: str
    relationship_type: str
    confidence_score: int
    reasoning: str

class SubmissionAnalyzer:
    def __init__(self, knowledge_graph):
        self.llm_client = LLMClient()
        self.knowledge_graph = knowledge_graph

    async def analyze_concept_submission(
        self, 
        title: str, 
        description: str, 
        source_material: Optional[str] = None
    ) -> ConceptAnalysis:
        """Analyze a student's concept submission using LLM"""
        
        # Get existing concepts for context
        existing_concepts = self.knowledge_graph.get_all_concepts()
        concept_names = [c['name'] for c in existing_concepts]
        
        system_prompt = f"""You are an expert mathematics curriculum designer. Analyze a student's submitted learning material and suggest how to integrate it into a knowledge graph.

EXISTING CONCEPTS IN KNOWLEDGE GRAPH:
{', '.join(concept_names)}

Your task:
1. Generate a unique concept ID (lowercase, underscore-separated)
2. Suggest a clear, standard concept name
3. Write a concise description (1-2 sentences)
4. Identify prerequisite concepts (from existing concepts)
5. Identify what concepts this leads to (from existing concepts)
6. Assess difficulty level (beginner/intermediate/advanced)
7. Provide confidence score (0-100) for your analysis
8. Explain your reasoning

Return ONLY valid JSON in this exact format:
{{
    "suggested_id": "concept_id_here",
    "suggested_name": "Concept Name Here",
    "description": "Clear, concise description here",
    "prerequisites": ["existing_concept_1", "existing_concept_2"],
    "leads_to": ["existing_concept_3", "existing_concept_4"],
    "difficulty_level": "intermediate",
    "confidence_score": 85,
    "reasoning": "Detailed explanation of your analysis"
}}"""

        user_prompt = f"""STUDENT SUBMISSION:
Title: {title}
Description: {description}
Source Material: {source_material or 'Not provided'}

Analyze this submission and provide your assessment:"""

        try:
            response = await self.llm_client.call_llm(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.2,
                max_tokens=1000
            )
            
            # Parse JSON response
            analysis_data = json.loads(response.strip())
            
            return ConceptAnalysis(
                suggested_id=analysis_data['suggested_id'],
                suggested_name=analysis_data['suggested_name'],
                description=analysis_data['description'],
                prerequisites=analysis_data['prerequisites'],
                leads_to=analysis_data['leads_to'],
                confidence_score=analysis_data['confidence_score'],
                difficulty_level=analysis_data['difficulty_level'],
                reasoning=analysis_data['reasoning']
            )
            
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"❌ Failed to parse LLM analysis: {e}")
            # Fallback analysis
            return ConceptAnalysis(
                suggested_id=self._generate_concept_id(title),
                suggested_name=title,
                description=description[:200] + "..." if len(description) > 200 else description,
                prerequisites=[],
                leads_to=[],
                confidence_score=30,
                difficulty_level="intermediate",
                reasoning="Automatic fallback due to parsing error"
            )

    async def validate_submission_quality(
        self, 
        title: str, 
        description: str
    ) -> Dict[str, any]:
        """Check if submission meets quality standards"""
        
        system_prompt = """You are a quality assessor for educational content. Evaluate a student submission for:

1. Clarity: Is the explanation clear and understandable?
2. Accuracy: Does the content appear mathematically correct?
3. Completeness: Is there enough information to be useful?
4. Uniqueness: Does this add value to existing knowledge?

Return JSON:
{
    "quality_score": 75,
    "meets_standards": true,
    "feedback": "Specific feedback for improvement",
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"]
}"""

        user_prompt = f"""SUBMISSION TO EVALUATE:
Title: {title}
Description: {description}

Provide your quality assessment:"""

        try:
            response = await self.llm_client.call_llm(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.2
            )
            
            return json.loads(response.strip())
            
        except Exception as e:
            logger.error(f"❌ Quality validation failed: {e}")
            return {
                "quality_score": 50,
                "meets_standards": True,
                "feedback": "Unable to assess quality automatically",
                "strengths": [],
                "weaknesses": []
            }

    def _generate_concept_id(self, title: str) -> str:
        """Generate a concept ID from title"""
        # Simple ID generation
        id_base = re.sub(r'[^a-zA-Z0-9\s]', '', title.lower())
        id_base = re.sub(r'\s+', '_', id_base.strip())
        return id_base[:50]  # Limit length

    async def detect_concept_relationships(
        self, 
        concept_analysis: ConceptAnalysis
    ) -> List[RelationshipAnalysis]:
        """Detect potential new relationships this concept might create"""
        
        # For now, return empty list - can be implemented later
        return []