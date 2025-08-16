import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  BookOpenIcon, 
  VideoCameraIcon,
  AcademicCapIcon,
  PlayIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  StarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import VisualRoadmap from './VisualRoadmap';
import EducationalResources from './EducationalResources';

const QueryWithResources = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [resourcesDiscovered, setResourcesDiscovered] = useState([]);
  const [activeTab, setActiveTab] = useState('explanation');
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setResourcesDiscovered([]);

    try {
      // Enhanced query with automatic resource discovery
      const response = await fetch('/api/v1/query-with-resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: query })
      });

      const data = await response.json();

      if (data.success) {
        setResponse(data);
        setResourcesDiscovered(data.educational_resources || []);
        
        // If we have identified concepts but no resources, trigger scraping
        if (data.identified_concepts.length > 0 && (!data.educational_resources || data.educational_resources.length === 0)) {
          await triggerResourceScraping(data.identified_concepts);
        }
      } else {
        setError(data.error_message || 'Failed to process query');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Query error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerResourceScraping = async (concepts) => {
    setResourcesLoading(true);
    try {
      console.log('🔍 Triggering resource scraping for concepts:', concepts);
      
      // Start background scraping
      const scrapeResponse = await fetch('/api/v1/scrape-educational-resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          concept_names: concepts,
          force_refresh: false,
          max_resources_per_concept: 6
        })
      });

      const scrapeData = await scrapeResponse.json();
      
      if (scrapeData.success) {
        console.log('✅ Resource scraping started successfully');
        
        // Poll for completion and new resources
        setTimeout(async () => {
          await refreshResources(concepts);
        }, 10000); // Check after 10 seconds
        
        setTimeout(async () => {
          await refreshResources(concepts);
        }, 20000); // Check again after 20 seconds
      }
    } catch (err) {
      console.error('❌ Failed to trigger resource scraping:', err);
    } finally {
      setResourcesLoading(false);
    }
  };

  const refreshResources = async (concepts) => {
    try {
      const allResources = [];
      
      for (const concept of concepts) {
        const response = await fetch(`/api/v1/resources/${concept}?limit=3`);
        const data = await response.json();
        
        if (data.success && data.resources) {
          allResources.push(...data.resources);
        }
      }
      
      if (allResources.length > 0) {
        setResourcesDiscovered(allResources);
        console.log(`🎯 Found ${allResources.length} educational resources`);
      }
    } catch (err) {
      console.error('❌ Failed to refresh resources:', err);
    }
  };

  const getResourceIcon = (type) => {
    switch (type) {
      case 'video':
        return <VideoCameraIcon className="h-5 w-5 text-red-500" />;
      case 'tutorial':
        return <AcademicCapIcon className="h-5 w-5 text-blue-500" />;
      case 'practice':
        return <PlayIcon className="h-5 w-5 text-green-500" />;
      case 'reference':
        return <BookOpenIcon className="h-5 w-5 text-purple-500" />;
      default:
        return <BookOpenIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getDifficultyColor = (level) => {
    switch (level) {
      case 'beginner':
        return 'text-green-600 bg-green-100';
      case 'intermediate':
        return 'text-yellow-600 bg-yellow-100';
      case 'advanced':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const renderQualityStars = (score) => {
    const stars = Math.round(score * 5);
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <StarIcon
            key={i}
            className={`h-4 w-4 ${
              i < stars ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Enhanced Query Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <MagnifyingGlassIcon className="h-6 w-6 text-blue-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">
            Ask a Math Question
          </h2>
          <SparklesIcon className="h-5 w-5 text-yellow-500 ml-2" title="Auto-discovers learning resources" />
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask any calculus question... (e.g., How do I find the derivative of sin(x) * cos(x)?)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isLoading}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <SparklesIcon className="h-4 w-4 inline mr-1" />
              Auto-discovers relevant YouTube videos, tutorials, and articles
            </div>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                  Ask Question
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Results with Tabs */}
      {response && (
        <div className="bg-white rounded-lg shadow-md">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('explanation')}
                className={`py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'explanation'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📝 Explanation
              </button>
              <button
                onClick={() => setActiveTab('roadmap')}
                className={`py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'roadmap'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🗺️ Learning Path
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                className={`py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'resources'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📚 Learning Resources
                {resourcesDiscovered.length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    {resourcesDiscovered.length}
                  </span>
                )}
                {resourcesLoading && (
                  <div className="ml-2 inline-block animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                )}
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'explanation' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Answer to: "{response.query}"
                </h3>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {response.explanation}
                  </div>
                </div>
                
                {response.identified_concepts.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-md font-medium text-gray-800 mb-2">
                      Key Concepts Identified:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {response.identified_concepts.map((concept, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'roadmap' && (
              <VisualRoadmap 
                learningPath={response.learning_path}
                onNodeClick={(nodeId) => console.log('Node clicked:', nodeId)}
                isLoading={false}
              />
            )}

            {activeTab === 'resources' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Educational Resources
                  </h3>
                  {resourcesLoading && (
                    <div className="flex items-center text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      <span className="text-sm">Discovering resources...</span>
                    </div>
                  )}
                </div>

                {resourcesDiscovered.length > 0 ? (
                  <div className="grid gap-4">
                    {resourcesDiscovered.map((resource, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              {getResourceIcon(resource.resource_type)}
                              <h4 className="text-md font-medium text-gray-800">
                                {resource.title}
                              </h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(resource.difficulty_level)}`}>
                                {resource.difficulty_level}
                              </span>
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-3">
                              {resource.description}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>{resource.source_domain}</span>
                                <span>•</span>
                                <span className="capitalize">{resource.resource_type}</span>
                                <span>•</span>
                                {renderQualityStars(resource.quality_score)}
                                {resource.duration && (
                                  <>
                                    <span>•</span>
                                    <div className="flex items-center">
                                      <ClockIcon className="h-3 w-3 mr-1" />
                                      <span>{resource.duration}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                <span>Open Resource</span>
                                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : resourcesLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      Discovering Learning Resources
                    </h4>
                    <p className="text-gray-600">
                      Searching YouTube, Khan Academy, and other educational sites...
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpenIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      No Resources Found Yet
                    </h4>
                    <p className="text-gray-600 mb-4">
                      Resources are being discovered in the background. Check back in a moment!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryWithResources;
