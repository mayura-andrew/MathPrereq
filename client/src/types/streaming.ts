// Streaming API Types

export type StreamEventType =
  | 'start'
  | 'progress'
  | 'concepts'
  | 'prerequisites'
  | 'context'
  | 'resources'
  | 'explanation_chunk'
  | 'explanation_complete'
  | 'complete'
  | 'error';

export interface StreamEvent<T = any> {
  type: StreamEventType;
  timestamp: string;
  query_id: string;
  data: T;
}

// Event data types
export interface StartEventData {
  query_id: string;
  question: string;
  user_id?: string;
  timestamp: string;
}

export interface ProgressEventData {
  stage: string;
  percentage: number;
  message: string;
  current_step: number;
  total_steps: number;
}

export interface ConceptsEventData {
  concepts: string[];
  count: number;
}

export interface PrerequisiteItem {
  id: string;
  name: string;
  description?: string;
  difficulty_level?: string;
}

export interface PrerequisitesEventData {
  prerequisites: PrerequisiteItem[];
  count: number;
}

export interface ContextEventData {
  chunks: string[];
  count: number;
}

export interface ResourceItem {
  id?: string;
  title: string;
  url: string;
  type: string;
  description?: string;
  platform?: string;
  quality_score?: number;
}

export interface ResourcesEventData {
  resources: ResourceItem[];
  count: number;
}

export interface ExplanationChunkEventData {
  chunk: string;
  total_chars: number;
}

export interface ExplanationCompleteEventData {
  full_explanation: string;
  total_length: number;
}

export interface CompleteEventData {
  query_id: string;
  processing_time: number;
  total_concepts: number;
  total_chunks: number;
  success: boolean;
}

export interface ErrorEventData {
  error: string;
  message: string;
  code?: string;
}

// Stream state for UI
export interface StreamState {
  isStreaming: boolean;
  queryId: string | null;
  progress: number;
  stage: string;
  currentStep: number;
  totalSteps: number;
  concepts: string[];
  prerequisites: PrerequisiteItem[];
  contextChunks: string[];
  resources: ResourceItem[];
  explanation: string;
  error: string | null;
  processingTime: number | null;
  completed: boolean;
}

// Event handlers
export type StreamEventHandler = (event: StreamEvent) => void;
export type StreamErrorHandler = (error: Error) => void;
export type StreamCompleteHandler = () => void;
