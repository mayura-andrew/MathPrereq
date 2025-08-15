from openai import AsyncOpenAI
import groq
from typing import Dict, Any, Optional, List
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from .config import settings

logger = structlog.get_logger()

class LLMClient:
    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None
        self.groq_client = groq.Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def call_llm(
        self, 
        prompt: str, 
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """Call LLM with retry logic and fallback"""

        model = model or settings.default_llm_model
        temperature = temperature if temperature is not None else settings.temperature
        max_tokens = max_tokens or settings.max_tokens

        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": prompt})

        try:
            if self.openai_client and settings.openai_api_key:
                logger.info(f"🤖 Calling OpenAI with model: {model}")
                response = await self.openai_client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                return response.choices[0].message.content
            
            elif self.groq_client and settings.groq_api_key:
                logger.info("🤖 Falling back to Groq")
                groq_model = "llama3-8b-8192"  # or "mixtral-8x7b-32768" -> "llama3-70b-8192"
                if "gpt-4" in model:
                    groq_model = "llama3-70b-8192"  # Better model for complex tasks
                elif "gpt-3.5" in model or "gpt-4o-mini" in model:
                    groq_model = "llama3-8b-8192"   # Faster model
                
                response = self.groq_client.chat.completions.create(
                    model=groq_model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                return response.choices[0].message.content
            else:
                raise Exception("No LLM API keys configured")
        except Exception as e:
            logger.error(f"❌ LLM call failed: {e}")
            raise

    async def identify_concepts(self, query: str) -> List[str]:
        """Extract mathematical concepts from user query"""
    
        system_prompt = """You are an expert in mathematics education. Your task is to identify the key mathematical concepts mentioned in a student's query.
Rules:
1. Extract only the core mathematical concepts (not general words)
2. Return concepts that would appear in a calculus curriculum
3. Format as a comma-separated list
4. Be precise and use standard mathematical terminology
5. Focus on concepts that would have prerequisite relationships

Examples:
Query: "I don't understand how to find the derivative of x^2"
Response: derivatives, power rule

Query: "What is integration by parts and when do I use it?"
Response: integration, integration by parts

Query: "I'm confused about limits and continuity"
Response: limits, continuity"""

        prompt = f"Student query: '{query}'\n\nIdentified concepts:"

        try:
            response = await self.call_llm(prompt, system_prompt, temperature=0.1)
            concepts = [concept.strip() for concept in response.split(',') if concept.strip()]
            logger.info(f"🎯 Identified concepts: {concepts}")
            return concepts
        except Exception as e:
            logger.error(f"❌ Failed to identify concepts: {e}")
            return []

    async def generate_explanation(
        self,
        query: str,
        prerequisite_path: List[Dict],
        context_chunks: List[str]
    ) -> str:
        """Generate educational explanation using RAG"""
    
        # Format prerequisite path
        path_text = ""
        if prerequisite_path:
            path_concepts = [concept['name'] for concept in prerequisite_path]
            path_text = f"Learning path: {' → '.join(path_concepts)}\n\n"

        context_text = "\n\n".join([f"Context {i+1}: {chunk}" for i, chunk in enumerate(context_chunks)])

        system_prompt = """You are an expert mathematics tutor specializing in calculus. Your goal is to provide clear, educational explanations that help students understand mathematical concepts and their prerequisites.

Guidelines:
1. Start with the fundamental concepts and build up logically
2. Explain WHY prerequisites are needed, not just WHAT they are
3. Use clear, accessible language but maintain mathematical accuracy
4. Include specific examples when helpful
5. Address the student's specific question directly
6. Keep explanations focused and not too lengthy
7. Use the provided context and learning path to ground your explanation"""
        
        prompt = f"""Student Question: {query}

{path_text}Relevant Course Material:
{context_text}

Please provide a clear, educational explanation that:
1. Addresses the student's question directly
2. Explains any necessary prerequisite concepts
3. Shows how the concepts connect to each other
4. Provides practical guidance for learning

Explanation:"""

        try:
            response = await self.call_llm(prompt, system_prompt, temperature=0.3)
            logger.info("✅ Generated explanation successfully")
            return response
        except Exception as e:
            logger.error(f"❌ Failed to generate explanation: {e}")
            return "I apologize, but I'm having trouble generating an explanation right now. Please try again."

    async def generate_followup_questions(self, query: str, explanation: str) -> List[str]:
        """Generate relevant follow-up questions based on the original query and explanation"""
        
        system_prompt = """You are an expert mathematics tutor. Based on a student's question and your explanation, generate 3-5 relevant follow-up questions that would help deepen their understanding.

Guidelines:
1. Questions should build on the current topic
2. Include both conceptual and practical questions
3. Vary the difficulty level
4. Make questions specific and actionable
5. Focus on common areas where students struggle
6. Return as a comma-separated list"""

        prompt = f"""Original Question: {query}

Your Explanation: {explanation}

Generate follow-up questions that would help this student learn more effectively:"""

        try:
            response = await self.call_llm(prompt, system_prompt, temperature=0.4)
            questions = [q.strip() for q in response.split(',') if q.strip()]
            logger.info(f"💭 Generated {len(questions)} follow-up questions")
            return questions[:5]  # Limit to 5 questions
        except Exception as e:
            logger.error(f"❌ Failed to generate follow-up questions: {e}")
            return []

    async def assess_difficulty(self, query: str) -> Dict[str, Any]:
        """Assess the difficulty level and prerequisites of a student's question"""
        
        system_prompt = """You are an expert in mathematics education assessment. Analyze a student's question and provide:
1. Difficulty level (beginner, intermediate, advanced)
2. Required prerequisites (as a list)
3. Confidence score (0-100) in your assessment
4. Estimated time to master (in hours)

Return your response in this exact format:
Difficulty: [level]
Prerequisites: [concept1, concept2, concept3]
Confidence: [score]
Time to master: [hours]"""

        prompt = f"Analyze this student question: '{query}'"

        try:
            response = await self.call_llm(prompt, system_prompt, temperature=0.1)
            
            # Parse the response
            lines = response.strip().split('\n')
            assessment = {}
            
            for line in lines:
                if ':' in line:
                    key, value = line.split(':', 1)
                    key = key.strip().lower().replace(' ', '_')
                    value = value.strip()
                    
                    if key == 'prerequisites':
                        assessment[key] = [p.strip() for p in value.split(',') if p.strip()]
                    elif key == 'confidence':
                        assessment[key] = int(value) if value.isdigit() else 50
                    elif key == 'time_to_master':
                        # Extract numeric value
                        import re
                        match = re.search(r'(\d+)', value)
                        assessment[key] = int(match.group(1)) if match else 5
                    else:
                        assessment[key] = value
            
            logger.info(f"📊 Assessed difficulty: {assessment}")
            return assessment
            
        except Exception as e:
            logger.error(f"❌ Failed to assess difficulty: {e}")
            return {
                'difficulty': 'intermediate',
                'prerequisites': [],
                'confidence': 50,
                'time_to_master': 5
            }

    async def check_understanding(self, query: str, student_response: str) -> Dict[str, Any]:
        """Check if student understands the concept based on their response"""
        
        system_prompt = """You are an expert mathematics tutor evaluating student understanding. Based on the original question and the student's response, assess:

1. Understanding level (poor, partial, good, excellent)
2. Specific strengths in their response
3. Areas that need improvement
4. Suggested next steps

Return in this format:
Understanding: [level]
Strengths: [strength1, strength2]
Improvements: [area1, area2]
Next steps: [step1, step2]"""

        prompt = f"""Original Question: {query}

Student's Response: {student_response}

Please evaluate the student's understanding:"""

        try:
            response = await self.call_llm(prompt, system_prompt, temperature=0.2)
            
            # Parse the response
            lines = response.strip().split('\n')
            evaluation = {}
            
            for line in lines:
                if ':' in line:
                    key, value = line.split(':', 1)
                    key = key.strip().lower().replace(' ', '_')
                    value = value.strip()
                    
                    if key in ['strengths', 'improvements', 'next_steps']:
                        evaluation[key] = [item.strip() for item in value.split(',') if item.strip()]
                    else:
                        evaluation[key] = value
            
            logger.info(f"🎓 Evaluated understanding: {evaluation.get('understanding', 'unknown')}")
            return evaluation
            
        except Exception as e:
            logger.error(f"❌ Failed to check understanding: {e}")
            return {
                'understanding': 'unknown',
                'strengths': [],
                'improvements': [],
                'next_steps': []
            }

    async def generate_practice_problems(self, concept: str, difficulty: str = "intermediate") -> List[Dict[str, str]]:
        """Generate practice problems for a specific mathematical concept"""
        
        system_prompt = f"""You are an expert mathematics educator. Generate 3 practice problems for the concept: {concept}

Requirements:
1. Difficulty level: {difficulty}
2. Include both the problem statement and solution
3. Problems should progressively build understanding
4. Include step-by-step solutions

Format each problem as:
Problem X: [problem statement]
Solution X: [detailed solution with steps]

Separate each problem with "---" """

        prompt = f"Generate practice problems for: {concept}"

        try:
            response = await self.call_llm(prompt, system_prompt, temperature=0.5)
            
            # Parse problems
            problems = []
            sections = response.split('---')
            
            for i, section in enumerate(sections[:3], 1):  # Limit to 3 problems
                lines = section.strip().split('\n')
                problem_text = ""
                solution_text = ""
                
                current_section = None
                for line in lines:
                    if line.strip().startswith(f'Problem {i}:'):
                        current_section = 'problem'
                        problem_text = line.replace(f'Problem {i}:', '').strip()
                    elif line.strip().startswith(f'Solution {i}:'):
                        current_section = 'solution'
                        solution_text = line.replace(f'Solution {i}:', '').strip()
                    elif current_section == 'problem' and line.strip():
                        problem_text += ' ' + line.strip()
                    elif current_section == 'solution' and line.strip():
                        solution_text += ' ' + line.strip()
                
                if problem_text and solution_text:
                    problems.append({
                        'problem': problem_text,
                        'solution': solution_text,
                        'concept': concept,
                        'difficulty': difficulty
                    })
            
            logger.info(f"📝 Generated {len(problems)} practice problems")
            return problems
            
        except Exception as e:
            logger.error(f"❌ Failed to generate practice problems: {e}")
            return []