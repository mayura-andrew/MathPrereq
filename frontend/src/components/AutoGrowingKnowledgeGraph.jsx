import React, { useState, useEffect } from 'react';
import { 
  AcademicCapIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  PencilIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const ConceptSuggestionCard = ({ suggestion, onReview }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [reviewAction, setReviewAction] = useState('');
  const [feedback, setFeedback] = useState('');

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-red-300 bg-red-50';
      case 'medium': return 'border-yellow-300 bg-yellow-50';
      case 'low': return 'border-green-300 bg-green-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />;
      case 'medium': return <ClockIcon className="h-4 w-4 text-yellow-600" />;
      case 'low': return <LightBulbIcon className="h-4 w-4 text-green-600" />;
      default: return <LightBulbIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleReview = (action) => {
    onReview(suggestion.id, action, feedback);
    setReviewAction('');
    setFeedback('');
  };

  return (
    <div className={`border-2 rounded-xl p-6 transition-all duration-200 ${getPriorityColor(suggestion.priority)}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getPriorityIcon(suggestion.priority)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{suggestion.concept_name}</h3>
            <p className="text-sm text-gray-600 mt-1">ID: {suggestion.concept_id}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {Math.round(suggestion.confidence_score * 100)}%
          </div>
          <div className="text-xs text-gray-500">confidence</div>
        </div>
      </div>

      {/* Description */}
      <div className="mb-4">
        <p className="text-gray-700 mb-2">{suggestion.description}</p>
        <div className="bg-white/50 border border-gray-200 rounded-lg p-3">
          <p className="text-sm text-gray-600">
            <strong>Reason for addition:</strong> {suggestion.reason}
          </p>
        </div>
      </div>

      {/* Prerequisites */}
      {suggestion.prerequisites.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Prerequisites:</h4>
          <div className="flex flex-wrap gap-2">
            {suggestion.prerequisites.map((prereq, index) => (
              <span
                key={index}
                className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium"
              >
                {prereq}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Source Query */}
      <div className="mb-4 bg-gray-100 border border-gray-200 rounded-lg p-3">
        <p className="text-sm text-gray-600 mb-1">
          <strong>Source Query:</strong>
        </p>
        <p className="text-sm italic text-gray-700">"{suggestion.source_query}"</p>
      </div>

      {/* Expand/Collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 flex items-center"
      >
        {isExpanded ? 'Show Less' : 'Show Review Options'}
        <ArrowRightIcon className={`h-4 w-4 ml-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>

      {/* Review Actions */}
      {isExpanded && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Expert Review:</h4>
          
          {/* Feedback Input */}
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Add your feedback or comments..."
            className="w-full border border-gray-300 rounded-lg p-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => handleReview('approve')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors"
            >
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Approve
            </button>
            <button
              onClick={() => handleReview('reject')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors"
            >
              <XCircleIcon className="h-4 w-4 mr-2" />
              Reject
            </button>
            <button
              onClick={() => handleReview('modify')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Request Changes
            </button>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Priority: {suggestion.priority}</span>
          <span>Suggested: {new Date(suggestion.suggested_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};

const AutoGrowingKnowledgeGraph = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('all');
  const [analysisQuery, setAnalysisQuery] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchSuggestions();
    fetchStats();
  }, [filter]);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/concept-suggestions?status=${filter === 'all' ? '' : filter}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setSuggestions(data);
      } else {
        console.warn('API returned non-array data:', data);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/knowledge-graph-stats');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setStats(data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({}); // Set empty object on error
    }
  };

  const handleReview = async (suggestionId, action, feedback) => {
    try {
      const response = await fetch(`/api/v1/expert-review/${suggestionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, feedback })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh suggestions after review
        await fetchSuggestions();
        await fetchStats();
      } else {
        console.error('Review failed:', result.message);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const analyzeQuery = async () => {
    if (!analysisQuery.trim()) return;
    
    try {
      setAnalyzing(true);
      const response = await fetch('/api/v1/analyze-prerequisites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: analysisQuery, include_suggestions: true })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Refresh suggestions to include new ones
      await fetchSuggestions();
      setAnalysisQuery('');
    } catch (error) {
      console.error('Error analyzing query:', error);
      // You might want to show an error message to the user here
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
        <div className="flex items-center mb-4">
          <AcademicCapIcon className="h-8 w-8 mr-3" />
          <h1 className="text-2xl font-bold">Auto-Growing Knowledge Graph</h1>
        </div>
        <p className="text-blue-100">
          Expert review system for expanding the mathematics prerequisite knowledge graph
        </p>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="text-3xl font-bold text-blue-600">{stats.total_concepts || 0}</div>
          <div className="text-gray-600">Total Concepts</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="text-3xl font-bold text-green-600">{stats.total_relationships || 0}</div>
          <div className="text-gray-600">Relationships</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="text-3xl font-bold text-yellow-600">{stats.pending_suggestions || 0}</div>
          <div className="text-gray-600">Pending Review</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="text-3xl font-bold text-purple-600">{stats.recent_additions?.length || 0}</div>
          <div className="text-gray-600">Recent Additions</div>
        </div>
      </div>

      {/* Query Analysis Tool */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Analyze New Query</h2>
        <div className="flex space-x-4">
          <input
            type="text"
            value={analysisQuery}
            onChange={(e) => setAnalysisQuery(e.target.value)}
            placeholder="Enter a mathematical problem or query to analyze prerequisites..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && analyzeQuery()}
          />
          <button
            onClick={analyzeQuery}
            disabled={analyzing || !analysisQuery.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {analyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Concept Suggestions</h2>
          <div className="flex space-x-2">
            {['all', 'pending_review', 'high', 'medium', 'low'].map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === filterOption
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterOption.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading suggestions...</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <AcademicCapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No concept suggestions found</p>
            <p className="text-sm text-gray-500 mt-2">Analyze some queries to generate suggestions</p>
          </div>
        ) : (
          (suggestions || []).map((suggestion) => (
            <ConceptSuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onReview={handleReview}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AutoGrowingKnowledgeGraph;
