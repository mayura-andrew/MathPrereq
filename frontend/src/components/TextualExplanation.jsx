import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { BookOpenIcon, ClockIcon, CheckCircleIcon, AcademicCapIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';

const TextualExplanation = ({ response }) => {
  if (!response) return null;

  // Custom components for markdown rendering
  const components = {
    h1: ({children}) => <h1 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-blue-200 pb-2">{children}</h1>,
    h2: ({children}) => <h2 className="text-xl font-semibold text-gray-800 mb-3 mt-6">{children}</h2>,
    h3: ({children}) => <h3 className="text-lg font-medium text-gray-700 mb-2 mt-4">{children}</h3>,
    h4: ({children}) => <h4 className="text-base font-medium text-gray-700 mb-2 mt-3">{children}</h4>,
    
    p: ({children}) => <p className="text-gray-700 leading-relaxed mb-4">{children}</p>,
    
    ul: ({children}) => <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">{children}</ul>,
    ol: ({children}) => <ol className="list-decimal list-inside text-gray-700 mb-4 space-y-1">{children}</ol>,
    li: ({children}) => <li className="ml-4">{children}</li>,
    
    blockquote: ({children}) => (
      <blockquote className="border-l-4 border-blue-400 bg-blue-50 pl-4 py-2 mb-4 italic text-gray-700">
        {children}
      </blockquote>
    ),
    
    code: ({inline, className, children, ...props}) => {
      const match = /language-(\w+)/.exec(className || '');
      if (!inline && match) {
        return (
          <div className="bg-gray-900 rounded-lg p-4 mb-4 overflow-x-auto">
            <code className={className} {...props}>
              {children}
            </code>
          </div>
        );
      }
      return (
        <code className="bg-gray-100 text-red-600 px-2 py-1 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },
    
    pre: ({children}) => (
      <div className="bg-gray-900 rounded-lg p-4 mb-4 overflow-x-auto">
        <pre className="text-gray-100 text-sm">{children}</pre>
      </div>
    ),
    
    strong: ({children}) => <strong className="font-semibold text-gray-800">{children}</strong>,
    em: ({children}) => <em className="italic text-gray-700">{children}</em>,
    
    table: ({children}) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
          {children}
        </table>
      </div>
    ),
    thead: ({children}) => <thead className="bg-gray-50">{children}</thead>,
    tbody: ({children}) => <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>,
    tr: ({children}) => <tr>{children}</tr>,
    th: ({children}) => (
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        {children}
      </th>
    ),
    td: ({children}) => (
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {children}
      </td>
    ),
  };

  const extractProblemStatement = (text) => {
    const match = text.match(/🚩 Problem.*?(?=\n\n|$)/s);
    return match ? match[0] : null;
  };

  const extractMainContent = (text) => {
    return text.replace(/🚩 Problem.*?(?=\n\n)/s, '').trim();
  };

    // Convert HTML mathematical notation to LaTeX - improved approach
  const convertHtmlMathToLatex = (text) => {
    if (!text) return text;
    
    let converted = text
      // Convert superscripts in mathematical expressions
      .replace(/([a-zA-Z0-9)]+)<sup>([^<]+)<\/sup>/g, '$1^{$2}')
      // Convert subscripts  
      .replace(/([a-zA-Z0-9)]+)<sub>([^<]+)<\/sub>/g, '$1_{$2}')
      // Handle specific mathematical patterns
      .replace(/r<sup>2<\/sup>/g, 'r^2')
      .replace(/500<sup>2<\/sup>/g, '500^2')
      .replace(/sec<sup>2<\/sup>/g, '\\sec^2')
      // Convert common patterns to inline math
      .replace(/([a-zA-Z]\^[0-9]+)/g, '$$$1$$')
      .replace(/(\\sec\^[0-9]+)/g, '$$$1$$')
      // Convert equations with = sign to inline math
      .replace(/([^$\n]*=[^$\n]*[\^_][^$\n]*)/g, (match) => {
        if (!match.includes('$') && !match.includes('<')) {
          return `$${match}$`;
        }
        return match;
      })
      // Convert fractions like (2/√3)² to LaTeX
      .replace(/\(([^)]+)\/([^)]+)\)\^([0-9]+)/g, '$$\\left(\\frac{$1}{$2}\\right)^{$3}$$')
      // Convert square roots
      .replace(/√([0-9]+)/g, '\\sqrt{$1}')
      .replace(/√([a-zA-Z])/g, '\\sqrt{$1}')
      // Convert pi and theta
      .replace(/π/g, '\\pi')
      .replace(/θ/g, '\\theta')
      // Wrap isolated mathematical expressions
      .replace(/\b([0-9]+\/[0-9]+)\b/g, '$$\\frac{$1}$$')
      .replace(/\b(dh\/dt|dr\/dt|dθ\/dt)\b/g, '$$\\frac{$1}$$');
    
    return converted;
  };

  const problemStatement = response.explanation ? extractProblemStatement(response.explanation) : null;
  const mainContent = response.explanation ? extractMainContent(response.explanation) : null;
  
  // Apply HTML to LaTeX conversion
  const processedProblemStatement = problemStatement ? convertHtmlMathToLatex(problemStatement) : null;
  const processedMainContent = mainContent ? convertHtmlMathToLatex(mainContent) : convertHtmlMathToLatex(response.explanation || '');

  return (
    <div className="bg-white rounded-lg shadow-md mb-6">
      <div className="flex items-center p-6 border-b border-gray-200">
        <BookOpenIcon className="h-6 w-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-800">
          Detailed Explanation & Solution
        </h2>
      </div>
      
      {response.success ? (
        <div className="p-6 space-y-6">
          {/* Query Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-2 flex items-center">
              <AcademicCapIcon className="h-5 w-5 mr-2" />
              Your Question:
            </h3>
            <p className="text-blue-700 font-medium">{response.query}</p>
          </div>
          
          {/* Problem Statement (if exists) */}
          {processedProblemStatement && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-medium text-red-800 mb-3 flex items-center">
                <LightBulbIcon className="h-5 w-5 mr-2" />
                Problem Statement:
              </h3>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={components}
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex, rehypeHighlight]}
                >
                  {processedProblemStatement}
                </ReactMarkdown>
              </div>
            </div>
          )}
          
          {/* Identified Concepts */}
          {response.identified_concepts && response.identified_concepts.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-800 mb-3">Mathematical Concepts Identified:</h3>
              <div className="flex flex-wrap gap-2">
                {response.identified_concepts.map((concept, index) => (
                  <span
                    key={index}
                    className="bg-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-medium shadow-sm"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Main Solution/Explanation */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-4 text-lg">Step-by-Step Solution:</h3>
            <div className="prose prose-lg max-w-none markdown-content">
              <ReactMarkdown
                components={components}
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeHighlight]}
              >
                {processedMainContent}
              </ReactMarkdown>
            </div>
          </div>
          
          {/* Learning Path Concepts */}
          {response.learning_path && response.learning_path.concepts && response.learning_path.concepts.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
              <h3 className="font-medium text-purple-800 mb-3">Learning Path Concepts:</h3>
              <div className="flex flex-wrap gap-2">
                {response.learning_path.concepts.slice(0, 8).map((concept, index) => (
                  <span
                    key={index}
                    className="bg-purple-200 text-purple-800 px-3 py-1 rounded-full text-sm font-medium shadow-sm"
                  >
                    {concept.name || concept}
                  </span>
                ))}
                {response.learning_path.concepts.length > 8 && (
                  <span className="text-purple-600 text-sm font-medium px-2 py-1">
                    +{response.learning_path.concepts.length - 8} more...
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Processing Info */}
          <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <ClockIcon className="h-4 w-4 mr-1" />
                <span>Processed in {response.processing_time?.toFixed(2) || '0.00'}s</span>
              </div>
              {response.identified_concepts?.length > 0 && (
                <div className="flex items-center">
                  <AcademicCapIcon className="h-4 w-4 mr-1" />
                  <span>{response.identified_concepts.length} concepts identified</span>
                </div>
              )}
            </div>
            <div className="flex items-center">
              <CheckCircleIcon className="h-4 w-4 mr-1 text-green-500" />
              <span className="text-green-600 font-medium">Successfully Generated</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h3 className="font-medium text-red-800 mb-2">Error Processing Query</h3>
            <div className="prose max-w-none">
              <ReactMarkdown
                components={components}
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeHighlight]}
              >
                {response.explanation}
              </ReactMarkdown>
            </div>
            {response.error && (
              <p className="text-sm text-red-600 mt-3 font-mono bg-red-100 p-2 rounded">
                Technical details: {response.error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TextualExplanation;