import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // Default timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log('🚀 API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Log cache hits vs processing
    if (response.data?.source) {
      const sourceIcon = response.data.source === 'cache' ? '⚡' : '🔄';
      console.log(`${sourceIcon} API Response:`, response.status, 
        `Source: ${response.data.source}`, 
        `Time: ${response.data.processing_time || 'N/A'}`);
    } else {
      console.log('✅ API Response:', response.status, response.data);
    }
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const mathAPI = {
  // Process a student query (original endpoint)
  async processQuery(question, context = null) {
    try {
      const response = await api.post('/query', {
        question,
        context
      }, {
        timeout: 120000
      });
      console.log(response.data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to process query');
    }
  },

  // 🆕 Smart concept query - Try multiple approaches to match Go struct
  async smartConceptQuery(conceptName, options = {}) {
    try {
      // Validate input
      if (!conceptName || typeof conceptName !== 'string') {
        throw new Error('Invalid concept name provided');
      }

      const cleanConceptName = conceptName.trim();
      
      if (!cleanConceptName) {
        throw new Error('Concept name cannot be empty');
      }
      
      // Backend validation: min=2, max=100
      if (cleanConceptName.length < 2) {
        throw new Error('Concept name must be at least 2 characters long');
      }
      
      if (cleanConceptName.length > 100) {
        cleanConceptName = cleanConceptName.substring(0, 100);
      }

      console.log(`🧠 Querying concept: "${cleanConceptName}"`);

      // First attempt: Use JSON tag format (this should be correct)
      const requestBody1 = {
        concept_name: cleanConceptName,
        user_id: options.userId || undefined
      };

      console.log('📤 Attempt 1 - JSON tag format:', JSON.stringify(requestBody1, null, 2));

      try {
        const response = await api.post('/concept-query', requestBody1, {
          timeout: options.timeout || 120000,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': `concept-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }
        });
        
        console.log("✅ Smart concept query response:", response.data);
        return response.data;
      } catch (firstError) {
        console.error('❌ First attempt failed:', firstError.response?.data);
        
        // Second attempt: Use struct field names (if JSON tags aren't working)
        console.log('🔄 Attempt 2 - Struct field format...');
        const requestBody2 = {
          ConceptName: cleanConceptName,
          UserID: options.userId || ""
        };

        console.log('📤 Attempt 2 - Struct field format:', JSON.stringify(requestBody2, null, 2));

        try {
          const response2 = await api.post('/concept-query', requestBody2, {
            timeout: options.timeout || 120000,
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': `concept-2nd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            }
          });
          
          console.log("✅ Second attempt successful:", response2.data);
          return response2.data;
        } catch (secondError) {
          console.error('❌ Second attempt failed:', secondError.response?.data);
          
          // Third attempt: Try camelCase
          console.log('🔄 Attempt 3 - camelCase format...');
          const requestBody3 = {
            conceptName: cleanConceptName,
            userId: options.userId || ""
          };

          console.log('📤 Attempt 3 - camelCase format:', JSON.stringify(requestBody3, null, 2));

          const response3 = await api.post('/concept-query', requestBody3, {
            timeout: options.timeout || 120000,
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': `concept-3rd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            }
          });
          
          console.log("✅ Third attempt successful:", response3.data);
          return response3.data;
        }
      }
      
    } catch (error) {
      console.error(`❌ All attempts failed for concept: "${conceptName}"`, error);
      
      // Provide detailed error information
      if (error.response) {
        const errorDetails = {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        };
        console.error('Error details:', errorDetails);
        
        throw new Error(`concept-query endpoint failed: ${error.response.data?.error || error.response.data?.message || error.message}`);
      }
      
      throw new Error(`Failed to get concept information for: ${conceptName}. ${error.message}`);
    }
  },

  // 🆕 Batch smart concept query for multiple concepts
  async batchSmartConceptQuery(conceptNames, userId = null, options = {}) {
    try {
      console.log(`🔄 Processing ${conceptNames.length} concepts...`);
      
      const { concurrent = 3, timeout = 180000 } = options;
      
      // Process concepts in batches to avoid overwhelming the server
      const results = [];
      for (let i = 0; i < conceptNames.length; i += concurrent) {
        const batch = conceptNames.slice(i, i + concurrent);
        
        const batchPromises = batch.map(async (concept) => {
          try {
            const data = await this.smartConceptQuery(concept, userId, { timeout });
            return { concept, success: true, data, error: null };
          } catch (error) {
            return { concept, success: false, data: null, error: error.message };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches
        if (i + concurrent < conceptNames.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      const successful = results.filter(r => r.success).length;
      console.log(`✅ Processed ${successful}/${conceptNames.length} concepts successfully`);
      
      return results;
    } catch (error) {
      throw new Error('Failed to process batch concept queries');
    }
  },

  // 🆕 Helper functions for concept data
  isFromCache(conceptData) {
    return conceptData?.source === 'cache';
  },

  getCacheAge(conceptData) {
    if (!this.isFromCache(conceptData) || !conceptData.cache_age) {
      return null;
    }
    return conceptData.cache_age;
  },

  getProcessingTime(conceptData) {
    return conceptData?.processing_time || 'Unknown';
  },

  getLearningPath(conceptData) {
    return conceptData?.learning_path || { concepts: [], total_concepts: 0 };
  },

  getEducationalResources(conceptData) {
    return conceptData?.educational_resources || [];
  },

  // Get all available concepts
  async getAllConcepts() {
    try {
      const response = await api.get('/concepts');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to get concepts');
    }
  },

  // Health check
  async healthCheck() {
    try {
      const response = await api.get('/health-detailed');
      return response.data;
    } catch (error) {
      throw new Error('Health check failed');
    }
  },

  // Find learning resources for a specific concept
  async findResourcesForConcept(concept) {
    try {
      const response = await api.post(`/resources/find/${encodeURIComponent(concept)}`, {}, {
        headers: {
          'X-Request-ID': `req-${Date.now()}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to find resources for concept');
    }
  },

  // Get stored resources for a concept
  async getResourcesForConcept(concept, limit = 20) {
    try {
      const response = await api.get(`/resources/concept/${encodeURIComponent(concept)}?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to get resources for concept');
    }
  },

  // Get resource statistics
  async getResourceStatistics() {
    try {
      const response = await api.get('/resources/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to get resource statistics');
    }
  },

  // ... your existing functions (submitConcept, getPendingSubmissions, etc.)
  async submitConcept(conceptData) {
    try {
      const response = await api.post('/submissions/submit-concept', conceptData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to submit concept');
    }
  },

  async getPendingSubmissions(reviewerId = null, status = 'pending_review', limit = 20) {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (limit) params.append('limit', limit.toString());
      
      const response = await api.get(`/concept-suggestions?${params.toString()}`);
      return { submissions: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to get pending submissions');
    }
  },

  async reviewSubmission(submissionId, reviewData) {
    try {
      const response = await api.post(`/expert-review/${submissionId}`, reviewData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to review submission');
    }
  },

  async getSubmissionStatistics() {
    try {
      const response = await api.get('/knowledge-graph-stats');
      return { statistics: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to get statistics');
    }
  },

  async debugTestScraping() {
    try {
      const response = await api.get('/debug/test-scraping');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to test scraping');
    }
  }
};

// 🆕 Export utility functions for concept management
export const conceptUtils = {
  // Format processing time for display
  formatProcessingTime(processingTime) {
    if (typeof processingTime === 'string') {
      return processingTime;
    }
    if (typeof processingTime === 'number') {
      return `${processingTime.toFixed(2)}s`;
    }
    return 'Unknown';
  },

  // Format cache age for display
  formatCacheAge(cacheAge) {
    if (!cacheAge) return null;
    
    // Parse duration like "2h30m15s" or "45s"
    const matches = cacheAge.match(/(\d+h)?(\d+m)?(\d+s)?/);
    if (!matches) return cacheAge;
    
    const parts = [];
    if (matches[1]) parts.push(matches[1]);
    if (matches[2]) parts.push(matches[2]);
    if (matches[3]) parts.push(matches[3]);
    
    return parts.join(' ');
  },

  // Check if concept data is recent (less than 1 hour old)
  isRecent(conceptData) {
    if (!mathAPI.isFromCache(conceptData)) return true; // Fresh data
    
    const cacheAge = conceptData.cache_age;
    if (!cacheAge) return false;
    
    // Simple check - if it contains 'h' (hours), it's not recent
    return !cacheAge.includes('h');
  }
};