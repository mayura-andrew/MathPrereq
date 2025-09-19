# MathPrereq Frontend Types

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)

Comprehensive TypeScript type definitions for the MathPrereq React frontend, derived from the Go backend API.

## 📋 **Table of Contents**

- [Core API Types](#-core-api-types)
- [Concept & Learning Types](#-concept--learning-types)
- [Resource Types](#-resource-types)
- [Query Types](#-query-types)
- [Health & System Types](#-health--system-types)
- [API Client Types](#-api-client-types)
- [React Hook Types](#-react-hook-types)
- [Utility Types](#-utility-types)
- [Error Handling](#-error-handling)

---

## 🎯 **Core API Types**

```typescript
// Base API Response Structure
export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  request_id: string;
  timestamp: string;
}

// Paginated Response
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

// Request Options
export interface RequestOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  headers?: Record<string, string>;
}

// Batch Operations
export interface BatchRequest<T> {
  items: T[];
  batch_size?: number;
  parallel?: boolean;
}

export interface BatchResponse<T> {
  results: {
    success: boolean;
    data?: T;
    error?: string;
    index: number;
  }[];
  total_processed: number;
  total_successful: number;
  total_failed: number;
  processing_time: string;
}
```

---

## 🧠 **Concept & Learning Types**

```typescript
// Mathematical Concept
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

// Concept Types
export type ConceptType =
  | 'prerequisite'
  | 'target'
  | 'related'
  | 'foundation'
  | 'advanced';

// Difficulty Levels
export type DifficultyLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert';

// Learning Path
export interface LearningPath {
  concepts: Concept[];
  total_concepts: number;
  estimated_duration?: string;
  difficulty_progression?: DifficultyProgression;
  completion_percentage?: number;
  current_concept_index?: number;
}

// Difficulty Progression
export type DifficultyProgression =
  | 'linear'
  | 'exponential'
  | 'varied'
  | 'custom';

// Concept Detail Response
export interface ConceptDetailResponse extends APIResponse {
  concept?: Concept;
  prerequisites: Concept[];
  leads_to: Concept[];
  detailed_explanation: string;
  related_resources: EducationalResource[];
  learning_path?: LearningPath;
}

// Concept List Response
export interface ConceptListResponse extends PaginatedResponse<Concept> {
  filters_applied?: {
    subject_area?: string;
    difficulty_level?: DifficultyLevel;
    type?: ConceptType;
    tags?: string[];
  };
}
```

---

## 📚 **Resource Types**

```typescript
// Educational Resource
export interface EducationalResource {
  id: string;
  title: string;
  url: string;
  description: string;
  resource_type: ResourceType;
  platform: ResourcePlatform;
  quality_score: number; // 0-100
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

// Resource Types
export type ResourceType =
  | 'video'
  | 'tutorial'
  | 'article'
  | 'exercise'
  | 'book'
  | 'course'
  | 'interactive'
  | 'quiz'
  | 'presentation';

// Resource Platforms
export type ResourcePlatform =
  | 'youtube'
  | 'khan_academy'
  | 'brilliant'
  | 'coursera'
  | 'mathworld'
  | 'mathisfun'
  | 'wikipedia'
  | 'textbook'
  | 'university'
  | 'other';

// Resource Statistics
export interface ResourceStatistics {
  total_resources: number;
  resources_by_platform: Record<ResourcePlatform, number>;
  resources_by_type: Record<ResourceType, number>;
  average_quality_score: number;
  recent_scraping_stats: {
    last_24h: number;
    last_7d: number;
    last_30d: number;
  };
  top_concepts: {
    concept_name: string;
    resource_count: number;
  }[];
}

// Resource Request/Response
export interface ResourceRequest {
  concept_name: string;
  limit?: number;
  resource_types?: ResourceType[];
  platforms?: ResourcePlatform[];
  min_quality_score?: number;
}

export interface ResourceResponse extends APIResponse<EducationalResource[]> {
  total_found: number;
  search_criteria?: ResourceRequest;
  processing_status?: 'completed' | 'in_progress' | 'queued';
}

// Batch Resource Operations
export interface BatchResourceRequest {
  concept_names: string[];
  limit?: number;
  resource_types?: ResourceType[];
  platforms?: ResourcePlatform[];
}

export interface BatchResourceResponse extends APIResponse {
  results: {
    concept_name: string;
    resources: EducationalResource[];
    total_found: number;
    status: 'success' | 'partial' | 'failed';
    error?: string;
  }[];
  overall_stats: {
    total_concepts_processed: number;
    total_resources_found: number;
    average_resources_per_concept: number;
  };
}
```

---

## 🔍 **Query Types**

```typescript
// Query Request
export interface QueryRequest {
  question?: string;
  text?: string;
  context?: string;
  user_id?: string;
  concept_name?: string;
  include_resources?: boolean;
  include_learning_path?: boolean;
}

// Smart Concept Query Request
export interface SmartConceptQueryRequest {
  concept_name: string;
  user_id?: string;
  include_resources?: boolean;
  include_learning_path?: boolean;
  max_resources?: number;
}

// Query Response
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

// Smart Concept Query Response
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

  // Client-side computed fields
  _client_metadata?: {
    request_time: string;
    response_size: number;
    cached: boolean;
  };

  _performance?: {
    client_duration_ms: number;
    server_processing_time: string;
    total_concepts: number;
    resource_count: number;
    cache_hit: boolean;
  };
}

// Query Source
export type QuerySource = 'cache' | 'processed' | 'mixed';

// LLM Provider Types
export type LLMProvider = 'openai' | 'gemini' | 'anthropic' | 'local';

// Query Analytics
export interface QueryAnalytics {
  total_queries: number;
  successful_queries: number;
  success_rate: number;
  avg_processing_time: number;
  popular_concepts: ConceptPopularity[];
  query_trends: QueryTrend[];
  processing_time_distribution: {
    under_1s: number;
    under_5s: number;
    under_10s: number;
    over_10s: number;
  };
}

// Concept Popularity
export interface ConceptPopularity {
  concept_name: string;
  query_count: number;
  last_queried: string;
  trending_score?: number;
}

// Query Trend
export interface QueryTrend {
  date: string;
  query_count: number;
  successful_queries: number;
  failed_queries: number;
  success_rate: number;
  avg_processing_time?: number;
}
```

---

## 🏥 **Health & System Types**

```typescript
// Health Status
export interface HealthStatus {
  service: string;
  status: HealthState;
  uptime?: string;
  last_check: string;
  details?: Record<string, any>;
  response_time_ms?: number;
}

// Health States
export type HealthState =
  | 'healthy'
  | 'unhealthy'
  | 'degraded'
  | 'unknown';

// System Health
export interface SystemHealth extends APIResponse {
  overall_status: HealthState;
  services: {
    mongodb: HealthStatus;
    neo4j: HealthStatus;
    weaviate: HealthStatus;
    llm: HealthStatus;
    scraper?: HealthStatus;
  };
  repositories: {
    concept_repository: HealthStatus;
    query_repository: HealthStatus;
    vector_repository: HealthStatus;
  };
  timestamp: string;
  uptime: string;
  version: string;
}

// Service Dependencies
export interface ServiceDependency {
  name: string;
  type: 'database' | 'api' | 'cache' | 'external';
  required: boolean;
  status: HealthState;
  last_check: string;
  connection_string?: string; // masked
}
```

---

## 🌐 **API Client Types**

```typescript
// Main API Client Interface
export interface MathAPIClient {
  // Query Methods
  processQuery(question: string, context?: string): Promise<QueryResponse>;
  smartConceptQuery(conceptName: string, userId?: string, options?: RequestOptions): Promise<SmartConceptQueryResponse>;
  batchSmartConceptQuery(conceptNames: string[], userId?: string, options?: RequestOptions): Promise<BatchResponse<SmartConceptQueryResponse>>;

  // Concept Methods
  getAllConcepts(options?: { page?: number; limit?: number; filters?: ConceptFilters }): Promise<ConceptListResponse>;
  getConceptDetail(conceptId: string): Promise<ConceptDetailResponse>;

  // Resource Methods
  findResourcesForConcept(concept: string, options?: ResourceRequest): Promise<ResourceResponse>;
  getResourcesForConcept(concept: string, limit?: number): Promise<ResourceResponse>;
  getResourceStatistics(): Promise<ResourceStatistics>;
  batchFindResources(request: BatchResourceRequest): Promise<BatchResourceResponse>;

  // Health Methods
  healthCheck(): Promise<SystemHealth>;
  healthCheckDetailed(): Promise<SystemHealth>;

  // Utility Methods
  isFromCache(response: SmartConceptQueryResponse): boolean;
  getCacheAge(response: SmartConceptQueryResponse): string | null;
  getProcessingTime(response: SmartConceptQueryResponse): string;
  getLearningPath(response: SmartConceptQueryResponse): LearningPath;
  getEducationalResources(response: SmartConceptQueryResponse): EducationalResource[];
}

// Concept Filters
export interface ConceptFilters {
  subject_area?: string;
  difficulty_level?: DifficultyLevel;
  type?: ConceptType;
  tags?: string[];
  search_query?: string;
}

// API Client Configuration
export interface APIClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  headers?: Record<string, string>;
  cache?: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
}
```

---

## ⚛️ **React Hook Types**

```typescript
// Loading States
export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number; // 0-100
  startTime?: Date;
  estimatedTimeRemaining?: number;
}

// Error States
export interface ErrorState {
  hasError: boolean;
  error?: APIError;
  retryCount: number;
  lastErrorTime?: Date;
}

// Concept Query Hook
export interface UseConceptQueryResult {
  // State
  data: SmartConceptQueryResponse | null;
  loading: LoadingState;
  error: ErrorState;
  isFromCache: boolean;
  performance: {
    totalDuration: number;
    serverProcessingTime: string;
  } | null;

  // Actions
  queryConcept: (conceptName: string, userId?: string, forceRefresh?: boolean) => Promise<SmartConceptQueryResponse>;
  retry: () => Promise<void>;
  clearCache: () => void;
  refresh: () => Promise<void>;

  // Computed Properties
  hasData: boolean;
  hasError: boolean;
  isLoading: boolean;
  isStale: boolean;
}

// Resources Hook
export interface UseResourcesResult {
  resources: EducationalResource[];
  loading: LoadingState;
  error: ErrorState;
  statistics: ResourceStatistics | null;

  // Actions
  findResources: (concept: string, options?: Partial<ResourceRequest>) => Promise<EducationalResource[]>;
  getStoredResources: (concept: string, limit?: number) => Promise<EducationalResource[]>;
  refreshStatistics: () => Promise<void>;
  searchResources: (query: string, filters?: ResourceFilters) => Promise<EducationalResource[]>;
}

// Resource Filters
export interface ResourceFilters {
  resource_types?: ResourceType[];
  platforms?: ResourcePlatform[];
  min_quality_score?: number;
  difficulty_level?: DifficultyLevel;
  tags?: string[];
}

// Health Check Hook
export interface UseHealthCheckResult {
  health: SystemHealth | null;
  loading: LoadingState;
  error: ErrorState;
  lastChecked: Date | null;

  // Actions
  checkHealth: () => Promise<SystemHealth>;
  checkHealthDetailed: () => Promise<SystemHealth>;
  startPeriodicCheck: (intervalMs?: number) => void;
  stopPeriodicCheck: () => void;

  // Computed Properties
  isHealthy: boolean;
  unhealthyServices: string[];
  degradedServices: string[];
  overallStatus: HealthState;
}

// Learning Path Hook
export interface UseLearningPathResult {
  learningPath: LearningPath | null;
  currentConcept: Concept | null;
  loading: LoadingState;
  error: ErrorState;
  progress: {
    completedConcepts: number;
    totalConcepts: number;
    percentage: number;
    estimatedTimeRemaining: number;
  };

  // Actions
  loadLearningPath: (conceptName: string) => Promise<LearningPath>;
  setCurrentConcept: (conceptId: string) => void;
  markConceptComplete: (conceptId: string) => Promise<void>;
  getNextConcept: () => Concept | null;
  getPreviousConcept: () => Concept | null;
}
```

---

## 🛠️ **Utility Types**

```typescript
// Generic Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type Nullable<T> = T | null;
export type Maybe<T> = T | undefined;

// API Endpoint Types
export type APIEndpoint =
  | '/query'
  | '/concept-query'
  | '/concepts'
  | '/concept-detail'
  | '/resources/find/:concept'
  | '/resources/concept/:concept'
  | '/resources'
  | '/resources/stats'
  | '/resources/find-batch'
  | '/health'
  | '/health-detailed';

// HTTP Methods
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Cache Configuration
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of cached items
  strategy: 'lru' | 'lfu' | 'fifo';
}

// Debounce Configuration
export interface DebounceConfig {
  delay: number;
  leading?: boolean;
  trailing?: boolean;
}

// Retry Configuration
export interface RetryConfig {
  attempts: number;
  delay: number;
  backoff: 'linear' | 'exponential';
  maxDelay?: number;
}
```

---

## 🚨 **Error Handling**

```typescript
// API Error Types
export interface APIError {
  success: false;
  error: string;
  error_code?: string;
  details?: Record<string, any>;
  request_id: string;
  timestamp: string;
  stack_trace?: string; // Only in development
}

// Validation Error
export interface ValidationError extends APIError {
  validation_errors: {
    field: string;
    message: string;
    code: string;
  }[];
}

// Network Error
export interface NetworkError extends APIError {
  status_code: number;
  url: string;
  method: HTTPMethod;
}

// Timeout Error
export interface TimeoutError extends APIError {
  timeout_ms: number;
  retry_after?: number;
}

// Rate Limit Error
export interface RateLimitError extends APIError {
  retry_after: number;
  limit: number;
  remaining: number;
  reset_time: string;
}

// Error Union Type
export type APIErrors =
  | APIError
  | ValidationError
  | NetworkError
  | TimeoutError
  | RateLimitError;

// Error Handler Type
export interface ErrorHandler {
  handleError: (error: APIErrors) => void;
  getErrorMessage: (error: APIErrors) => string;
  shouldRetry: (error: APIErrors) => boolean;
  getRetryDelay: (error: APIErrors) => number;
}

// Global Error State
export interface GlobalErrorState {
  errors: APIErrors[];
  hasErrors: boolean;
  lastError?: APIErrors;
  errorCount: number;
}
```

---

## 📦 **Export Structure**

```typescript
// Main exports
export * from './api';
export * from './concepts';
export * from './resources';
export * from './queries';
export * from './health';
export * from './client';
export * from './hooks';
export * from './utils';
export * from './errors';

// Type guards
export const isAPIError = (obj: any): obj is APIError => {
  return obj && typeof obj === 'object' && obj.success === false && typeof obj.error === 'string';
};

export const isSmartConceptQueryResponse = (obj: any): obj is SmartConceptQueryResponse => {
  return obj && typeof obj === 'object' && typeof obj.concept_name === 'string' && typeof obj.source === 'string';
};

export const isEducationalResource = (obj: any): obj is EducationalResource => {
  return obj && typeof obj === 'object' && typeof obj.id === 'string' && typeof obj.title === 'string';
};

export const isConcept = (obj: any): obj is Concept => {
  return obj && typeof obj === 'object' && typeof obj.id === 'string' && typeof obj.name === 'string';
};

// Constants
export const DIFFICULTY_LEVELS: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
export const CONCEPT_TYPES: ConceptType[] = ['prerequisite', 'target', 'related', 'foundation', 'advanced'];
export const RESOURCE_TYPES: ResourceType[] = ['video', 'tutorial', 'article', 'exercise', 'book', 'course', 'interactive', 'quiz', 'presentation'];
export const RESOURCE_PLATFORMS: ResourcePlatform[] = ['youtube', 'khan_academy', 'brilliant', 'coursera', 'mathworld', 'mathisfun', 'wikipedia', 'textbook', 'university', 'other'];

// Default configurations
export const DEFAULT_API_CONFIG: APIClientConfig = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  strategy: 'lru',
};
```

---

## 🎯 **Usage Examples**

### **Basic API Client Usage**

```typescript
import { MathAPIClient, SmartConceptQueryRequest } from '@mathprereq/types';

const client = new MathAPIClient({
  baseURL: 'http://localhost:8000',
  timeout: 30000,
});

const request: SmartConceptQueryRequest = {
  concept_name: 'derivatives',
  user_id: 'student123',
  include_resources: true,
};

const response = await client.smartConceptQuery('derivatives', 'student123');
console.log(`Found ${response.learning_path.total_concepts} concepts`);
```

### **React Hook Usage**

```typescript
import { useConceptQuery, useResources } from '@mathprereq/hooks';

function ConceptExplorer() {
  const { data, loading, error, queryConcept } = useConceptQuery();
  const { resources, findResources } = useResources();

  const handleSearch = async (conceptName: string) => {
    try {
      await queryConcept(conceptName);
      await findResources(conceptName);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  return (
    <div>
      {loading.isLoading && <div>Loading...</div>}
      {error.hasError && <div>Error: {error.error?.error}</div>}
      {data && (
        <div>
          <h2>{data.concept_name}</h2>
          <p>{data.explanation}</p>
          <div>Concepts: {data.learning_path.total_concepts}</div>
          <div>Resources: {data.educational_resources.length}</div>
        </div>
      )}
    </div>
  );
}
```

### **Error Handling**

```typescript
import { isAPIError, APIErrors } from '@mathprereq/types';

try {
  const response = await client.smartConceptQuery('invalid-concept');
} catch (error) {
  if (isAPIError(error)) {
    console.log(`API Error: ${error.error}`);
    if (error.error_code === 'VALIDATION_ERROR') {
      // Handle validation error
    }
  }
}
```

---

## 🔧 **Type Safety Features**

- ✅ **Strict TypeScript**: All types are properly typed with no `any` usage
- ✅ **Runtime Type Guards**: Functions to check types at runtime
- ✅ **Optional Fields**: Proper handling of optional/nullable fields
- ✅ **Union Types**: Comprehensive coverage of all possible values
- ✅ **Generic Types**: Reusable generic types for flexibility
- ✅ **Documentation**: Comprehensive JSDoc comments
- ✅ **Constants**: Predefined constants for dropdowns and validations
- ✅ **Default Configurations**: Sensible defaults for all configurations

## 🚀 **Integration Guide**

1. **Install Dependencies**:
   ```bash
   npm install @mathprereq/types
   ```

2. **Configure API Client**:
   ```typescript
   import { MathAPIClient, DEFAULT_API_CONFIG } from '@mathprereq/types';
   
   const client = new MathAPIClient(DEFAULT_API_CONFIG);
   ```

3. **Use in React Components**:
   ```typescript
   import { useConceptQuery, useResources } from '@mathprereq/hooks';
   ```

4. **Handle Errors Properly**:
   ```typescript
   import { isAPIError, APIErrors } from '@mathprereq/types';
   ```

This type system provides complete type safety and excellent developer experience for building the MathPrereq React frontend! 🎉