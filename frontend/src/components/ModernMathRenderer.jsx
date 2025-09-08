import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';

/**
 * Modern AI-Chat Style Markdown Renderer
 * Handles content like ChatGPT, Perplexity, Gemini with proper mathematical formatting
 */
const ModernMathRenderer = ({ content, className = '' }) => {
  
  // Advanced preprocessing to handle mixed content formats
  const preprocessContent = (text) => {
    if (!text) return '';
    
    let processed = text
      // Fix mathematical expressions first
      .replace(/\\theta/g, '\\theta')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '\\frac{$1}{$2}')
      .replace(/d\\theta\/dt/g, '$\\frac{d\\theta}{dt}$')
      .replace(/dh\/dt/g, '$\\frac{dh}{dt}$')
      .replace(/dx\/dt/g, '$\\frac{dx}{dt}$')
      .replace(/tan\(\\theta\)/g, '$\\tan(\\theta)$')
      .replace(/sec²\(\\theta\)/g, '$\\sec^2(\\theta)$')
      .replace(/cos²\(\\theta\)/g, '$\\cos^2(\\theta)$')
      .replace(/cos\(\\theta\)/g, '$\\cos(\\theta)$')
      .replace(/sin\(\\theta\)/g, '$\\sin(\\theta)$')
      
      // Convert section headers with better formatting
      .replace(/^### ([^:\n]+): (.+)$/gm, '\n## $1: $2\n')
      .replace(/^### ([^:\n]+)$/gm, '\n## $1\n')
      .replace(/^#### ([^:\n]+): (.+)$/gm, '\n### $1: $2\n')
      .replace(/^#### ([^:\n]+)$/gm, '\n### $1\n')
      
      // Handle step numbering
      .replace(/^Step (\d+): (.+)$/gm, '\n### Step $1: $2\n')
      .replace(/^#### Step (\d+): (.+)$/gm, '\n### Step $1: $2\n')
      
      // Format important statements
      .replace(/^\* ([^:]+): (.+)$/gm, '**$1**: $2')
      .replace(/^\* (.+)$/gm, '• $1')
      
      // Handle mathematical equations on their own lines
      .replace(/^\* (.+= .+)$/gm, '$$$$1$$')
      .replace(/^([a-zA-Z\\]+\([^)]+\) = [^$\n]+)$/gm, '$$$$1$$')
      
      // Fix common mathematical expressions
      .replace(/(\d+) m\/s/g, '$1$ m/s')
      .replace(/(\d+) m(?!\w)/g, '$1$ m')
      .replace(/h = (\d+)/g, '$h = $1$')
      .replace(/x = (\d+)/g, '$x = $1$')
      .replace(/z = ([^,\n.]+)/g, '$z = $1$')
      .replace(/θ = ([^,\n.]+)/g, '$\\theta = $1$')
      
      // Handle fractions and mathematical operations
      .replace(/(\d+)\/(\d+)/g, '$\\frac{$1}{$2}$')
      .replace(/sqrt\((\d+)\)/g, '$\\sqrt{$1}$')
      .replace(/\^(\d+)/g, '^{$1}')
      .replace(/²/g, '^2')
      
      // Clean up multiple line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '');
    
    return processed;
  };

  // Modern chat-style components
  const components = {
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
        {children}
      </h1>
    ),
    
    h2: ({ children }) => (
      <h2 className="text-xl font-semibold text-gray-800 mb-3 mt-6 flex items-center">
        <span className="w-1 h-6 bg-blue-500 mr-3 rounded"></span>
        {children}
      </h2>
    ),
    
    h3: ({ children }) => (
      <h3 className="text-lg font-medium text-gray-700 mb-2 mt-4">
        {children}
      </h3>
    ),
    
    h4: ({ children }) => (
      <h4 className="text-base font-medium text-gray-700 mb-2 mt-3">
        {children}
      </h4>
    ),
    
    p: ({ children }) => (
      <p className="text-gray-700 leading-7 mb-3 text-[15px]">
        {children}
      </p>
    ),
    
    ul: ({ children }) => (
      <ul className="space-y-2 mb-4 ml-4">
        {children}
      </ul>
    ),
    
    ol: ({ children }) => (
      <ol className="space-y-2 mb-4 ml-4 list-decimal">
        {children}
      </ol>
    ),
    
    li: ({ children }) => (
      <li className="text-gray-700 leading-7 text-[15px] flex items-start">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-3 mr-3 flex-shrink-0"></span>
        <span className="flex-1">{children}</span>
      </li>
    ),
    
    blockquote: ({ children }) => (
      <blockquote className="border-l-3 border-blue-400 bg-blue-50 pl-4 py-3 mb-4 rounded-r-md">
        <div className="text-gray-700 italic">
          {children}
        </div>
      </blockquote>
    ),
    
    code: ({ inline, className, children, ...props }) => {
      if (inline) {
        return (
          <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
            {children}
          </code>
        );
      }
      
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 overflow-x-auto">
          <code className="text-sm font-mono text-gray-800" {...props}>
            {children}
          </code>
        </div>
      );
    },
    
    pre: ({ children }) => (
      <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-4 overflow-x-auto text-sm font-mono">
        {children}
      </div>
    ),
    
    strong: ({ children }) => (
      <strong className="font-semibold text-gray-900">
        {children}
      </strong>
    ),
    
    em: ({ children }) => (
      <em className="italic text-gray-700">
        {children}
      </em>
    ),
    
    hr: () => (
      <hr className="border-gray-200 my-6" />
    ),
    
    table: ({ children }) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border border-gray-200 rounded-lg">
          {children}
        </table>
      </div>
    ),
    
    thead: ({ children }) => (
      <thead className="bg-gray-50">
        {children}
      </thead>
    ),
    
    tbody: ({ children }) => (
      <tbody className="bg-white divide-y divide-gray-200">
        {children}
      </tbody>
    ),
    
    tr: ({ children }) => <tr>{children}</tr>,
    
    th: ({ children }) => (
      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        {children}
      </th>
    ),
    
    td: ({ children }) => (
      <td className="px-4 py-2 text-sm text-gray-900">
        {children}
      </td>
    ),
  };

  // Process the content
  const processedContent = preprocessContent(content);

  return (
    <div className={`modern-math-content ${className}`}>
      <style jsx>{`
        .modern-math-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          line-height: 1.6;
          color: #374151;
        }
        
        .modern-math-content .katex {
          font-size: 1.1em;
        }
        
        .modern-math-content .katex-display {
          margin: 1.5rem 0;
          text-align: center;
        }
        
        .modern-math-content .katex-display .katex {
          display: inline-block;
          white-space: nowrap;
        }
      `}</style>
      
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeKatex, { 
            strict: false,
            trust: true,
            macros: {
              '\\theta': '\\theta',
              '\\frac': '\\frac'
            }
          }], 
          rehypeHighlight
        ]}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default ModernMathRenderer;