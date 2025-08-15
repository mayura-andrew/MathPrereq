import React, { useState, useEffect } from 'react';
import QueryInput from './components/QueryInput';
import TextualExplanation from './components/TextualExplanation';
import VisualRoadmap from './components/VisualRoadmap';
import LoadingSpinner from './components/LoadingSpinner';
import { mathAPI } from './services/api';
import { 
  AcademicCapIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState(null);
  const [error, setError] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [isHealthy, setIsHealthy] = useState(false);

  // Check system health on startup
  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    try {
      const health = await mathAPI.healthCheck();
      setSystemHealth(health);
      setIsHealthy(health.status === 'healthy');
      console.log('System Health:', health);
    } catch (error) {
      console.error('Health check failed:', error);
      setIsHealthy(false);
      setSystemHealth({ 
        status: 'unhealthy', 
        error: error.message 
      });
    }
  };

  const handleQuerySubmit = async (question, context) => {
    setIsLoading(true);
    setError(null);
    setCurrentResponse(null);

    try {
      console.log('🔍 Processing query:', question);
      const response = await mathAPI.processQuery(question, context);
      setCurrentResponse(response);
      
      if (!response.success) {
        setError(response.error_message || 'Query processing failed');
      }
    } catch (error) {
      console.error('Query failed:', error);
      setError(error.message || 'Failed to process your question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeClick = async (conceptId) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('🎯 Getting concept details for:', conceptId);
      const response = await mathAPI.getConceptDetail(conceptId);
      
      if (response.success) {
        // Create a new query response from the concept detail
        const conceptResponse = {
          success: true,
          query: `Tell me about ${response.concept.name}`,
          identified_concepts: [response.concept.name],
          learning_path: {
            concepts: [
              ...response.prerequisites,
              response.concept,
              ...response.leads_to
            ],
            total_concepts: response.prerequisites.length + 1 + response.leads_to.length,
            path_type: "concept_exploration"
          },
          explanation: response.detailed_explanation,
          retrieved_context: [],
          processing_time: 0
        };
        
        setCurrentResponse(conceptResponse);
      } else {
        setError('Failed to get concept details');
      }
    } catch (error) {
      console.error('Concept detail failed:', error);
      setError(error.message || 'Failed to get concept information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // System Status Component
  const SystemStatus = () => (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-3 ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm font-medium">
            System Status: {isHealthy ? 'Healthy' : 'Unhealthy'}
          </span>
        </div>
        {systemHealth && (
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>KG: {systemHealth.total_concepts || 0} concepts</span>
            <span>Vector DB: {systemHealth.total_chunks || 0} chunks</span>
            <button 
              onClick={checkSystemHealth}
              className="text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Error Alert Component
  const ErrorAlert = ({ message, onClose }) => (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
      <div className="flex items-center">
        <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
        <div className="flex-1">
          <p className="text-red-800">{message}</p>
        </div>
        <button 
          onClick={onClose}
          className="text-red-400 hover:text-red-600"
        >
          <XCircleIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <AcademicCapIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Mathematics Learning Framework
              </h1>
              <p className="text-gray-600 text-sm">
                AI-powered prerequisite knowledge identification for calculus
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Status */}
        <SystemStatus />

        {/* Error Display */}
        {error && (
          <ErrorAlert 
            message={error} 
            onClose={() => setError(null)} 
          />
        )}

        {/* System Health Warning */}
        {!isHealthy && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
              <div>
                <p className="text-yellow-800">
                  System is not fully operational. Some features may not work correctly.
                </p>
                <p className="text-yellow-700 text-sm mt-1">
                  Please ensure the backend server is running and API keys are configured.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Query Input */}
        <QueryInput 
          onSubmit={handleQuerySubmit}
          isLoading={isLoading}
        />

        {/* Loading State */}
        {isLoading && <LoadingSpinner />}

        {/* Results */}
        {!isLoading && currentResponse && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Textual Explanation */}
            <div className="lg:col-span-1">
              <TextualExplanation response={currentResponse} />
            </div>
            
            {/* Right Column: Visual Roadmap */}
            <div className="lg:col-span-1">
              <VisualRoadmap 
                learningPath={currentResponse.learning_path}
                onNodeClick={handleNodeClick}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}

        {/* Welcome Message - Show when no response yet */}
        {!isLoading && !currentResponse && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <AcademicCapIcon className="h-16 w-16 mx-auto text-blue-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Welcome to the Mathematics Learning Framework
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Ask any question about calculus and get personalized learning paths with visual roadmaps. 
              Our AI system will identify the prerequisite concepts you need to understand and provide 
              clear explanations tailored to your background.
            </p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-blue-50 p-4 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <h3 className="font-medium text-blue-800">Concept Identification</h3>
                <p className="text-blue-700">AI identifies key mathematical concepts from your questions</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <h3 className="font-medium text-green-800">Learning Paths</h3>
                <p className="text-green-700">Visual roadmaps show prerequisite knowledge sequences</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <h3 className="font-medium text-purple-800">Interactive Exploration</h3>
                <p className="text-purple-700">Click concepts to dive deeper into prerequisites</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>Mathematics Learning Framework v0.1.0 - Research Prototype</p>
            <p className="mt-1">
              Powered by LLM + Knowledge Graph + RAG Architecture
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
