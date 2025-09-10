import axios from 'axios'

const API_BASE_URL = 'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 30 seconds for complex queries
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log('🚀 API Request:', config.method.toUpperCase(), config.url);
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
    console.log('✅ API Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const mathAPI = {
  // Process a student query
  async processQuery(question, context = null) {
    try {
      const response = await api.post('/query', {
        question,
        context
      }, {
        timeout: 120000
      });
      console.log(response.data)
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to process query');
    }
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

  // Get submission statistics
  async getSubmissionStatistics() {
    try {
      const response = await api.get('/knowledge-graph-stats');
      return { statistics: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to get statistics');
    }
  },


  async getResourceStatistics() {
    try {
      const response = await api.get('/resources/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to get resource statistics');
    }
  },

  // Debug and testing
  async debugTestScraping() {
    try {
      const response = await api.get('/debug/test-scraping');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to test scraping');
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
  }
};
