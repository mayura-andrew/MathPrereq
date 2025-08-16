import React, { useState } from 'react';
import { PlusCircleIcon, BookOpenIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { mathAPI } from '../services/api';

const ConceptSubmissionForm = ({ onSubmissionSuccess }) => {
  const [formData, setFormData] = useState({
    student_id: '',
    student_name: '',
    title: '',
    description: '',
    source_material: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await mathAPI.submitConcept(formData);
      setSubmission(response);
      
      if (response.success) {
        onSubmissionSuccess?.(response);
        // Reset form
        setFormData({
          student_id: '',
          student_name: '',
          title: '',
          description: '',
          source_material: ''
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  if (submission?.success) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Concept Submitted Successfully!
          </h2>
          <div className="bg-green-50 p-4 rounded-md mb-4">
            <h3 className="font-medium text-green-800 mb-2">Submission Details:</h3>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>Suggested Name:</strong> {submission.suggested_concept_name}</p>
              <p><strong>Confidence Score:</strong> {submission.confidence_score}%</p>
              <p><strong>Estimated Review Time:</strong> {submission.estimated_review_time}</p>
              <p><strong>Submission ID:</strong> {submission.submission_id}</p>
            </div>
          </div>
          
          {submission.feedback && (
            <div className="bg-blue-50 p-4 rounded-md mb-4">
              <h3 className="font-medium text-blue-800 mb-2">AI Analysis Feedback:</h3>
              <p className="text-sm text-blue-700">{submission.feedback}</p>
            </div>
          )}
          
          <button
            onClick={() => setSubmission(null)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Submit Another Concept
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <PlusCircleIcon className="h-6 w-6 text-green-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-800">
          Contribute to Knowledge Graph
        </h2>
      </div>

      <div className="bg-blue-50 p-4 rounded-md mb-6">
        <div className="flex items-start">
          <BookOpenIcon className="h-5 w-5 text-blue-600 mt-1 mr-2" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Help expand our mathematics knowledge base!</p>
            <p>Submit concepts, examples, or explanations. Our AI will analyze your submission and suggest how to integrate it into the knowledge graph. Expert reviewers will validate before adding.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name (Optional)
            </label>
            <input
              type="text"
              value={formData.student_name}
              onChange={handleChange('student_name')}
              placeholder="e.g., Alex Smith"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student ID (Optional)
            </label>
            <input
              type="text"
              value={formData.student_id}
              onChange={handleChange('student_id')}
              placeholder="e.g., student123"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Concept Title *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={handleChange('title')}
            placeholder="e.g., L'Hôpital's Rule, Product Rule for Derivatives, etc."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detailed Description *
          </label>
          <textarea
            required
            rows={6}
            value={formData.description}
            onChange={handleChange('description')}
            placeholder="Provide a clear explanation of the concept, including:
• What it is and how it works
• When and why it's used
• Examples if possible
• Common mistakes to avoid"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Source Material (Optional)
          </label>
          <input
            type="text"
            value={formData.source_material}
            onChange={handleChange('source_material')}
            placeholder="e.g., Calculus by Stewart Chapter 4, Khan Academy, etc."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !formData.title || !formData.description}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Analyzing Submission...</span>
            </>
          ) : (
            <>
              <PlusCircleIcon className="h-5 w-5" />
              <span>Submit for Review</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-sm text-gray-600">
        <h3 className="font-medium mb-2">Submission Process:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>AI analyzes your submission for quality and relevance</li>
          <li>Suggests integration points with existing knowledge graph</li>
          <li>Expert reviewer validates and approves/rejects</li>
          <li>Approved concepts are automatically added to the system</li>
        </ol>
      </div>
    </div>
  );
};

export default ConceptSubmissionForm;