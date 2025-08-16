import React, { useState, useEffect } from 'react';
import { 
  BookOpenIcon, 
  VideoCameraIcon, 
  AcademicCapIcon,
  PlayIcon,
  ArrowTopRightOnSquareIcon,
  FunnelIcon,
  StarIcon
} from '@heroicons/react/24/outline';

const EducationalResources = ({ conceptId, conceptName }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    resource_type: '',
    difficulty_level: '',
    min_quality_score: 0.6
  });
  const [stats, setStats] = useState(null);
  const [scrapingStatus, setScrapingStatus] = useState(null);

  useEffect(() => {
    if (conceptId) {
      loadResources();
    }
    loadStats();
  }, [conceptId, filters]);

  const loadResources = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...filters,
        limit: 20
      });
      
      const response = await fetch(`/api/v1/resources/${conceptId}?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setResources(data.resources);
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/v1/resources/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.statistics);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const startScraping = async () => {
    try {
      setScrapingStatus('starting');
      
      const response = await fetch('/api/v1/scrape-educational-resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          concept_ids: conceptId ? [conceptId] : null,
          force_refresh: true,
          max_resources_per_concept: 10
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setScrapingStatus('running');
        // Poll for completion
        setTimeout(() => {
          setScrapingStatus('completed');
          loadResources();
          loadStats();
        }, 30000); // Check after 30 seconds
      }
    } catch (error) {
      console.error('Failed to start scraping:', error);
      setScrapingStatus('error');
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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Educational Resources
            {conceptName && (
              <span className="text-blue-600 ml-2">for {conceptName}</span>
            )}
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Curated learning materials from trusted educational sources
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={startScraping}
            disabled={scrapingStatus === 'running'}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm"
          >
            {scrapingStatus === 'running' ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Scraping...
              </div>
            ) : (
              'Find New Resources'
            )}
          </button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {stats.total_resources}
            </div>
            <div className="text-sm text-blue-800">Total Resources</div>
          </div>
          
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {stats.by_type?.video || 0}
            </div>
            <div className="text-sm text-green-800">Videos</div>
          </div>
          
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {stats.by_type?.tutorial || 0}
            </div>
            <div className="text-sm text-purple-800">Tutorials</div>
          </div>
          
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {stats.avg_quality_score}
            </div>
            <div className="text-sm text-orange-800">Avg Quality</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <FunnelIcon className="h-5 w-5 text-gray-600" />
        
        <select
          value={filters.resource_type}
          onChange={(e) => setFilters({...filters, resource_type: e.target.value})}
          className="border border-gray-300 rounded-md px-3 py-1 text-sm"
        >
          <option value="">All Types</option>
          <option value="video">Videos</option>
          <option value="tutorial">Tutorials</option>
          <option value="article">Articles</option>
          <option value="practice">Practice</option>
          <option value="example">Examples</option>
        </select>

        <select
          value={filters.difficulty_level}
          onChange={(e) => setFilters({...filters, difficulty_level: e.target.value})}
          className="border border-gray-300 rounded-md px-3 py-1 text-sm"
        >
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>

        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Quality:</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={filters.min_quality_score}
            onChange={(e) => setFilters({...filters, min_quality_score: parseFloat(e.target.value)})}
            className="w-20"
          />
          <span className="text-sm text-gray-600">
            {(filters.min_quality_score * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Resources List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : resources.length > 0 ? (
        <div className="grid gap-4">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getResourceIcon(resource.resource_type)}
                    <h3 className="text-lg font-medium text-gray-800">
                      {resource.title}
                    </h3>
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
      ) : (
        <div className="text-center py-12">
          <BookOpenIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Educational Resources Found
          </h3>
          <p className="text-gray-600 mb-4">
            {conceptId 
              ? `No resources found for this concept with current filters.`
              : 'Select a concept to view its educational resources.'
            }
          </p>
          {conceptId && (
            <button
              onClick={startScraping}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Find Resources for This Concept
            </button>
          )}
        </div>
      )}

      {/* Scraping Status */}
      {scrapingStatus && (
        <div className={`mt-4 p-3 rounded-md ${
          scrapingStatus === 'running' ? 'bg-blue-50 text-blue-800' :
          scrapingStatus === 'completed' ? 'bg-green-50 text-green-800' :
          scrapingStatus === 'error' ? 'bg-red-50 text-red-800' :
          'bg-gray-50 text-gray-800'
        }`}>
          {scrapingStatus === 'running' && '🔍 Searching for educational resources...'}
          {scrapingStatus === 'completed' && '✅ Resource scraping completed successfully!'}
          {scrapingStatus === 'error' && '❌ Failed to scrape resources. Please try again.'}
        </div>
      )}
    </div>
  );
};

export default EducationalResources;