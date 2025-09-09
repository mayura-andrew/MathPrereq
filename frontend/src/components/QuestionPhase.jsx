import { useState, useRef, useEffect } from 'react'
import { PaperAirplaneIcon, SparklesIcon, BookOpenIcon } from '@heroicons/react/24/outline'

const QuestionPhase = ({ onSubmit, loading, question, setQuestion }) => {
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }, [question])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (question.trim() && !loading) {
      onSubmit(question.trim())
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const exampleQuestions = [
    "How do I solve quadratic equations?",
    "What is the chain rule in calculus?", 
    "Explain matrix multiplication",
    "How do I find derivatives of trigonometric functions?",
  ]

  return (
    <div className="ai-chat-home">
      <div className="ai-chat-container">
        {/* Logo and Title */}
        <div className="brand-section">
          <div className="brand-logo">
            <BookOpenIcon className="logo-icon" />
          </div>
          <h1 className="brand-title">MathPrereq</h1>
          <p className="brand-subtitle">
            AI-powered mathematics learning assistant
          </p>
        </div>

        {/* Chat Input */}
        <div className="chat-input-section">
          <form onSubmit={handleSubmit} className="chat-form">
            <div className="chat-input-wrapper">
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about mathematics..."
                className="chat-input"
                disabled={loading}
                rows="1"
              />
              <button 
                type="submit" 
                className="chat-send-button"
                disabled={!question.trim() || loading}
              >
                {loading ? (
                  <div className="send-spinner"></div>
                ) : (
                  <PaperAirplaneIcon className="send-icon" />
                )}
              </button>
            </div>
          </form>

          {loading && (
            <div className="thinking-indicator">
              <div className="thinking-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="thinking-text">Thinking...</span>
            </div>
          )}
        </div>

        {/* Example Prompts */}
        {!loading && (
          <div className="examples-section">
            <div className="examples-header">
              <SparklesIcon className="examples-icon" />
              <span>Try these examples</span>
            </div>
            <div className="examples-list">
              {exampleQuestions.map((example, index) => (
                <button
                  key={index}
                  className="example-prompt"
                  onClick={() => setQuestion(example)}
                  disabled={loading}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default QuestionPhase