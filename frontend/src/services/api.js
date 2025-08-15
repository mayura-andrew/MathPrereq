import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for complex queries
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
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to process query');
    }
    },
    // Get detailed information about a concept
  async getConceptDetail(conceptId) {
    try {
      const response = await api.post('/concept-detail', {
        concept_id: conceptId
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to get concept details');
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
  }
};
  