import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import remarkParse from 'remark-parse';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';

/**
 * Enhanced Markdown Renderer specifically designed for mathematical content
 * Handles complex LaTeX expressions, broken formatting, and academic writing
 */
const MathMarkdownRenderer = ({ content, className = '' }) => {
  // Advanced text preprocessing for mathematical content
  const preprocessMathContent = (text) => {
    if (!text) return '';
    
    // Step 1: Fix completely broken LaTeX expressions
    let processed = text
      // Handle malformed integral expressions
      .replace(/\$\$\$ I = \\int_0\^?\\?infty \\frac\{[^}]*\\sin\^?2[^}]*\}\{[^}]*x\^?2[^}]*\} \\?, dx/gi, 
               '$$I = \\int_0^{\\infty} \\frac{\\sin^2(x)}{x^2} \\, dx$$')
      
      // Clean up broken dollar sign patterns
      .replace(/\$\([^)]*\)/g, (match) => match.replace(/\$/g, ''))
      .replace(/\$([a-zA-Z0-9_^{}\\]+)\$/g, '$1')
      
      // Fix broken sin, cos, tan functions
      .replace(/\\si\$?n\^?(\d*)\$?\(([^)]+)\)/gi, (match, power, arg) => 
               power ? `\\sin^{${power}}(${arg})` : `\\sin(${arg})`)
      .replace(/\\co\$?s\^?(\d*)\$?\(([^)]+)\)/gi, (match, power, arg) => 
               power ? `\\cos^{${power}}(${arg})` : `\\cos(${arg})`)
      
      // Fix broken fractions
      .replace(/\\frac\{([^}]*\\si[^}]*)\}\{([^}]+)\}/gi, (match, num, den) => {
        const cleanNum = num.replace(/\\si\$?n\^?(\d*)\$?\(([^)]+)\)/gi, (m, p, a) => 
                              p ? `\\sin^{${p}}(${a})` : `\\sin(${a})`);
        return `\\frac{${cleanNum}}{${den}}`;
      })
      
      // Handle triple dollar signs and cleanup
      .replace(/\$\$\$ ([^$]*?) \$\$\$/g, '$$$$1$$')
      .replace(/\$\$\$([^$]+)\$\$\$/g, '$$$$1$$')
      .replace(/\$\$\$([^$]*)/g, '$$$$1$$')
      
      // Convert mathematical symbols
      .replace(/∞/g, '\\infty')
      .replace(/π/g, '\\pi')
      .replace(/θ/g, '\\theta')
      .replace(/→/g, '\\to')
      .replace(/≤/g, '\\leq')
      .replace(/≥/g, '\\geq')
      .replace(/±/g, '\\pm')
      .replace(/×/g, '\\times')
      .replace(/÷/g, '\\div')
      
      // Fix common limit expressions
      .replace(/\\lim_?\{?([^}\\s]+)\\?s?\\?to\\?s?([^}\\s]+)\}?/g, '\\lim_{$1 \\to $2}')
      
      // Fix integral bounds
      .replace(/\\int_([^\\s{]+)\^?\\?infty/g, '\\int_{$1}^{\\infty}')
      .replace(/\\int_([^\\s{]+)\^([^\\s{]+)/g, '\\int_{$1}^{$2}')
      
      // Convert headers and structure
      .replace(/^([A-Z][^:\n]*): ([A-Z][^:\n]*)$/gm, '## $1: $2')
      .replace(/^(Step \d+): ([^:\n]+)$/gm, '### $1: $2')  
      .replace(/^(Prerequisite \d+): ([^:\n]+)$/gm, '### $1: $2')
      .replace(/^(Introduction|Conclusion|Step-by-Step Solution|Practical Guidance|Summary): ([^:\n]+)$/gm, '## $1: $2')
      .replace(/^(Introduction|Conclusion|Step-by-Step Solution|Practical Guidance|Summary)$/gm, '## $1')
      
      // Format important questions and statements
      .replace(/^Why is this prerequisite needed\?/gm, '**Why is this prerequisite needed?**')
      .replace(/^The formula is:/gm, '**The formula is:**')
      .replace(/^Note on (.+):/gm, '**Note on $1:**')
      .replace(/^Let ([^:]+):/gm, '**Let $1:**')
      .replace(/^When ([^:]+):/gm, '**When $1:**')
      .replace(/^At the ([^:]+):/gm, '**At the $1:**')
      
      // Clean up spacing and formatting
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '');
    
    return processed;
  };

  // Enhanced markdown components for mathematical content
  const components = {
    h1: ({children}) => (
      <h1 className="text-3xl font-bold text-gray-900 mb-6 border-b-2 border-blue-300 pb-3">
        {children}
      </h1>
    ),
    h2: ({children}) => (
      <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-8 border-l-4 border-blue-500 pl-4">
        {children}
      </h2>
    ),
    h3: ({children}) => (
      <h3 className="text-xl font-medium text-gray-700 mb-3 mt-6">
        {children}
      </h3>
    ),
    h4: ({children}) => (
      <h4 className="text-lg font-medium text-gray-700 mb-2 mt-4">
        {children}
      </h4>
    ),
    
    p: ({children}) => (
      <p className="text-gray-700 leading-relaxed mb-4 text-justify">
        {children}
      </p>
    ),
    
    ul: ({children}) => (
      <ul className="list-disc list-outside text-gray-700 mb-4 space-y-2 ml-6">
        {children}
      </ul>
    ),
    ol: ({children}) => (
      <ol className="list-decimal list-outside text-gray-700 mb-4 space-y-2 ml-6">
        {children}
      </ol>
    ),
    li: ({children}) => (
      <li className="leading-relaxed">
        {children}
      </li>
    ),
    
    blockquote: ({children}) => (
      <blockquote className="border-l-4 border-blue-400 bg-blue-50 pl-6 py-4 mb-6 italic text-gray-700 rounded-r-lg">
        {children}
      </blockquote>
    ),
    
    code: ({inline, className, children, ...props}) => {
      const match = /language-(\w+)/.exec(className || '');
      if (!inline && match) {
        return (
          <div className="bg-gray-900 rounded-lg p-4 mb-6 overflow-x-auto border border-gray-300">
            <code className={`language-${match[1]} text-sm`} {...props}>
              {children}
            </code>
          </div>
        );
      }
      return (
        <code className="bg-gray-100 text-red-600 px-2 py-1 rounded text-sm font-mono border" {...props}>
          {children}
        </code>
      );
    },
    
    pre: ({children}) => (
      <div className="bg-gray-900 rounded-lg p-4 mb-6 overflow-x-auto border border-gray-300">
        <pre className="text-gray-100 text-sm leading-relaxed">{children}</pre>
      </div>
    ),
    
    strong: ({children}) => (
      <strong className="font-semibold text-gray-900">{children}</strong>
    ),
    em: ({children}) => (
      <em className="italic text-gray-700">{children}</em>
    ),
    
    table: ({children}) => (
      <div className="overflow-x-auto mb-6 border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          {children}
        </table>
      </div>
    ),
    thead: ({children}) => (
      <thead className="bg-gray-50">{children}</thead>
    ),
    tbody: ({children}) => (
      <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>
    ),
    tr: ({children}) => <tr>{children}</tr>,
    th: ({children}) => (
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        {children}
      </th>
    ),
    td: ({children}) => (
      <td className="px-6 py-4 text-sm text-gray-900 leading-relaxed">
        {children}
      </td>
    ),
  };

  const processedContent = preprocessMathContent(content);

  return (
    <div className={`math-markdown-content ${className}`}>
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MathMarkdownRenderer;