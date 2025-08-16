import React from 'react';
import { CheckCircleIcon, LightBulbIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const MathematicalStep = ({ 
  stepNumber, 
  title, 
  children, 
  type = 'default', 
  highlight = false 
}) => {
  const getStepStyles = () => {
    const baseStyles = "border-l-4 pl-4 py-3 mb-4 rounded-r-lg";
    
    switch (type) {
      case 'formula':
        return `${baseStyles} border-blue-500 bg-blue-50`;
      case 'calculation':
        return `${baseStyles} border-green-500 bg-green-50`;
      case 'insight':
        return `${baseStyles} border-purple-500 bg-purple-50`;
      case 'warning':
        return `${baseStyles} border-yellow-500 bg-yellow-50`;
      case 'result':
        return `${baseStyles} border-emerald-500 bg-emerald-50`;
      default:
        return `${baseStyles} border-gray-300 bg-gray-50`;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'insight':
        return <LightBulbIcon className="h-5 w-5 text-purple-600" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'result':
        return <CheckCircleIcon className="h-5 w-5 text-emerald-600" />;
      default:
        return (
          <div className="h-5 w-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
            {stepNumber}
          </div>
        );
    }
  };

  return (
    <div className={`${getStepStyles()} ${highlight ? 'ring-2 ring-blue-300' : ''}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>
        <div className="flex-grow">
          {title && (
            <h4 className="font-semibold text-gray-800 mb-2 text-sm uppercase tracking-wide">
              {title}
            </h4>
          )}
          <div className="text-gray-700">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MathematicalStep;
