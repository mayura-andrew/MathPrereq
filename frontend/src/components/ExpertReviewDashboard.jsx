import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { mathAPI } from '../services/api';

const ExpertReviewDashboard = ({ reviewerId }) => {
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    loadPendingSubmissions();
    loadStatistics();
  }, []);

  const loadPendingSubmissions = async () => {
    try {
      const response = await mathAPI.getPendingSubmissions(reviewerId);
      setPendingSubmissions(response.submissions);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await mathAPI.getSubmissionStatistics();
      setStatistics(response.statistics);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleReview = async (submissionId, decision, comments, modifications = {}) => {
    try {
      const response = await mathAPI.reviewSubmission(submissionId, {
        action: decision === 'approved' ? 'approve' : 'reject',
        feedback: comments,
        modifications
      });
      
      // Refresh the list
      await loadPendingSubmissions();
      setSelectedSubmission(null);
      
      // Return the response so SubmissionReview can access it
      return response;
    } catch (error) {
      console.error('Review failed:', error);
      throw error; // Re-throw so SubmissionReview can handle it
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Expert Review Dashboard
        </h2>
        {statistics && (
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>Pending: {statistics.pending_count}</span>
            <span>Approved: {statistics.approved_count}</span>
            <span>Total: {statistics.total_count}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submissions List */}
        <div>
          <h3 className="font-medium text-gray-800 mb-4">Pending Submissions</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {pendingSubmissions.map((submission) => (
              <div
                key={submission.id}
                onClick={() => setSelectedSubmission(submission)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedSubmission?.id === submission.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{submission.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {submission.description.substring(0, 100)}...
                    </p>
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <UserIcon className="h-4 w-4 mr-1" />
                      <span>{submission.student_name || 'Anonymous'}</span>
                      <ClockIcon className="h-4 w-4 ml-3 mr-1" />
                      <span>{new Date(submission.submitted_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      submission.confidence_score >= 80 
                        ? 'bg-green-100 text-green-800'
                        : submission.confidence_score >= 60
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {submission.confidence_score}% confidence
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Review */}
        <div>
          {selectedSubmission ? (
            <SubmissionReview
              submission={selectedSubmission}
              onReview={handleReview}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a submission to review</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SubmissionReview = ({ submission, onReview }) => {
  const [decision, setDecision] = useState('');
  const [comments, setComments] = useState('');
  const [modifications, setModifications] = useState({
    suggested_name: submission.suggested_concept_name,
    description: submission.suggested_description
  });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [integrationStatus, setIntegrationStatus] = useState(null);




const handleSubmitReview = async () => {
    if (!decision) return;
    
    setIsSubmitting(true);
    try {
      console.log('Submitting review:', { submissionId: submission.id, decision, comments });
      
      const response = await onReview(submission.id, decision, comments, modifications);
      
      console.log('Review response:', response);
      
      // Check for integration status in response
      if (response?.integration_status) {
        setIntegrationStatus(response.integration_status);
      } else if (response?.status) {
        setIntegrationStatus(response.status);
      } else if (decision === 'approved') {
        setIntegrationStatus('success');
      }
      
      // Reset form after successful submission
      setDecision('');
      setComments('');
      
    } catch (error) {
      console.error('Review failed:', error);
      setIntegrationStatus('failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-800">Review: {submission.title}</h3>
      
      {/* Original Submission */}
      <div className="bg-gray-50 p-4 rounded-md">
        <h4 className="font-medium text-gray-700 mb-2">Original Submission</h4>
        <p className="text-sm text-gray-600 mb-2">
          <strong>Title:</strong> {submission.title}
        </p>
        <p className="text-sm text-gray-600 mb-2">
          <strong>Description:</strong> {submission.description}
        </p>
        {submission.source_material && (
          <p className="text-sm text-gray-600">
            <strong>Source:</strong> {submission.source_material}
          </p>
        )}
      </div>

      {/* AI Analysis */}
      <div className="bg-blue-50 p-4 rounded-md">
        <h4 className="font-medium text-blue-800 mb-2">AI Analysis</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>Suggested ID:</strong> {submission.suggested_concept_id}</p>
          <p><strong>Suggested Name:</strong> {submission.suggested_concept_name}</p>
          <p><strong>Description:</strong> {submission.suggested_description}</p>
          <p><strong>Prerequisites:</strong> {submission.suggested_prerequisites}</p>
          <p><strong>Leads to:</strong> {submission.suggested_leads_to}</p>
          <p><strong>Confidence:</strong> {submission.confidence_score}%</p>
        </div>
      </div>

      {/* Review Decision */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Review Decision
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDecision('approved')}
              className={`p-3 rounded-md text-sm font-medium transition-colors ${
                decision === 'approved'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              <CheckCircleIcon className="h-5 w-5 inline mr-2" />
              Approve
            </button>
            <button
              onClick={() => setDecision('rejected')}
              className={`p-3 rounded-md text-sm font-medium transition-colors ${
                decision === 'rejected'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-100 text-red-800 hover:bg-red-200'
              }`}
            >
              <XCircleIcon className="h-5 w-5 inline mr-2" />
              Reject
            </button>
          </div>
        </div>
        
        {/* Integration Status Display */}
      {integrationStatus && (
        <div className={`p-4 rounded-md ${
          integrationStatus === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            {integrationStatus === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-600 mr-2" />
                          )}
                          <div>
              <h4 className={`font-medium ${
                integrationStatus === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {integrationStatus === 'success' 
                  ? 'Integration Successful!' 
                  : 'Integration Failed'}
              </h4>
              <p className={`text-sm ${
                integrationStatus === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                {integrationStatus === 'success' 
                  ? 'Concept has been added to the knowledge graph and CSV files updated.'
                  : 'Failed to integrate concept. Manual intervention may be required.'}
              </p>
            </div>
          </div>
        </div>
      )}
        

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Review Comments
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
            placeholder="Provide feedback for the student and rationale for your decision..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        <button
          onClick={handleSubmitReview}
          disabled={!decision || isSubmitting}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting Review...
            </div>
          ) : (
            'Submit Review'
          )}
        </button>
      </div>
    </div>
  );
};

export default ExpertReviewDashboard;