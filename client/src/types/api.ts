// Core API Types
export interface APIResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  request_id: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Concept & Learning Types
export interface Concept {
  id: string;
  name: string;
  description: string;
  type: ConceptType;
  difficulty_level?: DifficultyLevel;
  subject_area?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  metadata?: {
    prerequisites_count?: number;
    leads_to_count?: number;
    resource_count?: number;
  };
}

export type ConceptType = 'prerequisite' | 'target' | 'related' | 'foundation' | 'advanced';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface LearningPath {
  concepts: Concept[];
  total_concepts: number;
  estimated_duration?: string;
  difficulty_progression?: DifficultyProgression;
  completion_percentage?: number;
  current_concept_index?: number;
}

export type DifficultyProgression = 'linear' | 'exponential' | 'varied' | 'custom';

// Resource Types
export interface EducationalResource {
  id: string;
  title: string;
  url: string;
  description: string;
  resource_type: ResourceType;
  platform: ResourcePlatform;
  quality_score: number;
  difficulty_level: DifficultyLevel;
  estimated_duration?: string;
  language: string;
  thumbnail_url?: string;
  author?: string;
  rating?: number;
  view_count?: number;
  tags: string[];
  concept_ids: string[];
  created_at: string;
  updated_at: string;
  scraped_at: string;
  last_verified?: string;
  metadata?: {
    content_length?: number;
    video_duration?: string;
    interactive_elements?: boolean;
    prerequisites?: string[];
  };
}

export type ResourceType = 'video' | 'tutorial' | 'article' | 'exercise' | 'book' | 'course' | 'interactive' | 'quiz' | 'presentation';
export type ResourcePlatform = 'youtube' | 'khan_academy' | 'brilliant' | 'coursera' | 'mathworld' | 'mathisfun' | 'wikipedia' | 'textbook' | 'university' | 'other';

// Query Types
export interface QueryResponse extends APIResponse {
  query: string;
  identified_concepts: string[];
  learning_path: LearningPath;
  explanation: string;
  retrieved_context: string[];
  processing_time: string;
  llm_provider?: LLMProvider;
  llm_model?: string;
  tokens_used?: number;
  confidence_score?: number;
  error_message?: string;
}

export interface SmartConceptQueryResponse extends APIResponse {
  concept_name: string;
  source: QuerySource;
  identified_concepts: string[];
  learning_path: LearningPath;
  explanation: string;
  educational_resources: EducationalResource[];
  processing_time: string;
  cache_age?: string;
  resources_message?: string;
  request_id: string;
  timestamp: string;
}

export type QuerySource = 'cache' | 'processed' | 'mixed';
export type LLMProvider = 'openai' | 'gemini' | 'anthropic' | 'local';

// Message Type for Chat
export interface Message {
  id: number;
  text: string | QueryResponse | SmartConceptQueryResponse;
  role: 'user' | 'bot';
}

// Health & System Types
export interface HealthStatus {
  status: string;
  uptime?: string;
  last_check: string;
  details?: Record<string, unknown>;
  response_time_ms?: number;
}

export interface SystemHealth {
  overall_status?: string;
  status?: string;
  services?: Record<string, HealthStatus>;
  repositories?: Record<string, HealthStatus>;
  timestamp: string;
  uptime?: string;
  version?: string;
}
