import React from 'react';
import { BookOpenIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const TextualExplanation = ({ response }) => {
  if (!response) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center mb-4">
        <BookOpenIcon className="h-6 w-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-800">
          Explanation & Learning Guide
        </h2>
      </div>
      
      {response.success ? (
        <div className="space-y-4">
          {/* Query Summary */}
          <div className="bg-blue-50 p-4 rounded-md">
            <h3 className="font-medium text-blue-800 mb-2">Your Question:</h3>
            <p className="text-blue-700">{response.query}</p>
          </div>
          
          {/* Identified Concepts */}
          {response.identified_concepts.length > 0 && (
            <div className="bg-green-50 p-4 rounded-md">
              <h3 className="font-medium text-green-800 mb-2">Identified Concepts:</h3>
              <div className="flex flex-wrap gap-2">
                {response.identified_concepts.map((concept, index) => (
                  <span
                    key={index}
                    className="bg-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Main Explanation */}
          <div className="prose max-w-none">
            <h3 className="font-medium text-gray-800 mb-3">Detailed Explanation:</h3>
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {response.explanation}
            </div>
          </div>
          
          {/* Processing Info */}
          <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              <span>Processed in {response.processing_time.toFixed(2)}s</span>
            </div>
            <div className="flex items-center">
              <CheckCircleIcon className="h-4 w-4 mr-1 text-green-500" />
              <span>Success</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 p-4 rounded-md">
          <h3 className="font-medium text-red-800 mb-2">Error Processing Query</h3>
          <p className="text-red-700">{response.explanation}</p>
          {response.error_message && (
            <p className="text-sm text-red-600 mt-2">
              Technical details: {response.error_message}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TextualExplanation;