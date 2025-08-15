import React, { useState } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

const QueryInput = ({ onSubmit, isLoading }) => {
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (question.trim() && !isLoading) {
      onSubmit(question.trim(), context.trim() || null);
    }
  };

  const sampleQuestions = [
    "I don't understand how to find the derivative of x²",
    "What is integration by parts and when do I use it?",
    "I'm confused about limits and continuity",
    "How do I solve integrals with substitution?",
    "What are the prerequisites for learning the chain rule?"
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Ask Your Mathematics Question
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
            Your Question *
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., I don't understand how to find the derivative of x²"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
            required
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-2">
            Additional Context (Optional)
          </label>
          <input
            id="context"
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g., I'm a computer science student new to calculus"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
        </div>
        
        <button
          type="submit"
          disabled={!question.trim() || isLoading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <PaperAirplaneIcon className="h-5 w-5" />
              <span>Get Learning Path</span>
            </>
          )}
        </button>
      </form>
      
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Sample Questions:</h3>
        <div className="space-y-2">
          {sampleQuestions.map((sample, index) => (
            <button
              key={index}
              onClick={() => setQuestion(sample)}
              className="text-left text-sm text-blue-600 hover:text-blue-800 hover:underline block w-full"
              disabled={isLoading}
            >
              "{sample}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QueryInput;