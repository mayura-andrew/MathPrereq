import { useState, useRef, useEffect } from 'react'

const QuestionPhase = ({ onSubmit, loading, question, setQuestion }) => {
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
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

  return (
    <div className="question-phase">
      <div className="question-container">
        <h2>What math concept would you like to learn?</h2>
        <p className="subtitle">
          Ask any mathematics question and get a step-by-step explanation with learning path
        </p>
        
        <form onSubmit={handleSubmit} className="question-form">
          <div className="input-group">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., How do I solve quadratic equations? What is calculus? Explain derivatives..."
              className="question-input"
              disabled={loading}
              rows="3"
            />
            <button 
              type="submit" 
              className="submit-btn"
              disabled={!question.trim() || loading}
            >
              {loading ? 'Processing...' : 'Get Answer'}
            </button>
          </div>
        </form>

        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Analyzing your question and building learning path...</p>
          </div>
        )}

        <div className="examples">
          <h3>Example questions:</h3>
          <div className="example-chips">
            {[
              "How do I factor polynomials?",
              "What is the chain rule in calculus?",
              "Explain matrix multiplication",
              "How do I solve systems of equations?"
            ].map((example) => (
              <button
                key={example}
                className="example-chip"
                onClick={() => setQuestion(example)}
                disabled={loading}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuestionPhase