import type {
  QueryResponse,
  SmartConceptQueryResponse,
  APIResponse,
  SystemHealth,
  EducationalResource
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

class MathPrereqAPI {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Health Check
  async healthCheck(): Promise<SystemHealth> {
    return this.request<SystemHealth>('/health');
  }

  async healthCheckDetailed(): Promise<SystemHealth> {
    return this.request<SystemHealth>('/health-detailed');
  }

  // Query Processing
  async processQuery(question: string, context?: string, userId?: string): Promise<QueryResponse> {
    return this.request<QueryResponse>('/query', {
      method: 'POST',
      body: JSON.stringify({
        question,
        context,
        user_id: userId,
      }),
    });
  }

  // Smart Concept Query (Main Feature)
  async smartConceptQuery(
    conceptName: string,
    options: {
      userId?: string;
      includeResources?: boolean;
      includeLearningPath?: boolean;
      maxResources?: number;
    } = {}
  ): Promise<SmartConceptQueryResponse> {
    return this.request<SmartConceptQueryResponse>('/concept-query', {
      method: 'POST',
      body: JSON.stringify({
        concept_name: conceptName,
        user_id: options.userId,
        include_resources: options.includeResources ?? true,
        include_learning_path: options.includeLearningPath ?? true,
        max_resources: options.maxResources ?? 10,
      }),
    });
  }

  // Educational Resources
  async getResourcesForConcept(
    concept: string,
    options: {
      limit?: number;
      platform?: string;
      resourceType?: string;
      minQuality?: number;
      difficulty?: string;
    } = {}
  ): Promise<EducationalResource[]> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.platform) params.append('platform', options.platform);
    if (options.resourceType) params.append('resource_type', options.resourceType);
    if (options.minQuality) params.append('min_quality', options.minQuality.toString());
    if (options.difficulty) params.append('difficulty', options.difficulty);

    const queryString = params.toString();
    const endpoint = `/resources/concept/${encodeURIComponent(concept)}${queryString ? `?${queryString}` : ''}`;

    const response = await this.request<APIResponse<EducationalResource[]>>(endpoint);
    return response.data || [];
  }

  // Utility methods
  isFromCache(response: SmartConceptQueryResponse): boolean {
    return response.source === 'cache';
  }

  getCacheAge(response: SmartConceptQueryResponse): string | null {
    return response.cache_age || null;
  }

  getProcessingTime(response: SmartConceptQueryResponse): string {
    return response.processing_time;
  }

  getLearningPath(response: SmartConceptQueryResponse) {
    return response.learning_path;
  }

  getEducationalResources(response: SmartConceptQueryResponse): EducationalResource[] {
    return response.educational_resources || [];
  }
}

// Export singleton instance
export const mathAPI = new MathPrereqAPI();

// Export class for custom instances
export { MathPrereqAPI };
