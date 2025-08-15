import React from 'react';

const LoadingSpinner = ({ message = "Processing your query..." }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            AI is thinking...
          </h3>
          <p className="text-gray-600">{message}</p>
        </div>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-75"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-150"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;