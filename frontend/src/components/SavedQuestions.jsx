import { useState } from 'react'

const SavedQuestions = ({ savedItems, onDelete, onViewAnswer }) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredItems = savedItems.filter(item =>
    item.question.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="saved-questions">
      <div className="saved-header">
        <h2>📚 Your Saved Questions</h2>
        <p>Review your learning journey and revisit concepts anytime</p>
        
        {savedItems.length > 0 && (
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search your saved questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        )}
      </div>

      <div className="saved-content">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            {savedItems.length === 0 ? (
              <>
                <div className="empty-icon">🤔</div>
                <h3>No saved questions yet</h3>
                <p>Save interesting questions and their learning paths to review later!</p>
              </>
            ) : (
              <>
                <div className="empty-icon">🔍</div>
                <h3>No matching questions found</h3>
                <p>Try a different search term</p>
              </>
            )}
          </div>
        ) : (
          <div className="saved-items">
            {filteredItems.map((item) => (
              <div key={item.id} className="saved-item">
                <div className="saved-item-header">
                  <h3 className="saved-question">{item.question}</h3>
                  <div className="saved-actions">
                    <button
                      className="view-btn"
                      onClick={() => onViewAnswer(item)}
                      title="View answer and learning path"
                    >
                      👁️ View
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => onDelete(item.id)}
                      title="Delete saved question"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="saved-item-meta">
                  <span className="saved-date">
                    💾 Saved on {formatDate(item.savedAt)}
                  </span>
                </div>

                {item.answer?.summary && (
                  <div className="saved-preview">
                    <p className="preview-text">
                      {item.answer.summary.substring(0, 150)}
                      {item.answer.summary.length > 150 ? '...' : ''}
                    </p>
                  </div>
                )}

                {item.answer?.key_concepts && item.answer.key_concepts.length > 0 && (
                  <div className="saved-concepts">
                    <span className="concepts-label">Key concepts:</span>
                    {item.answer.key_concepts.slice(0, 3).map((concept, index) => (
                      <span key={index} className="concept-tag">
                        {typeof concept === 'string' ? concept : concept.name || concept.title}
                      </span>
                    ))}
                    {item.answer.key_concepts.length > 3 && (
                      <span className="more-concepts">
                        +{item.answer.key_concepts.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {savedItems.length > 0 && (
        <div className="saved-stats">
          <p>
            📊 You have saved <strong>{savedItems.length}</strong> question
            {savedItems.length !== 1 ? 's' : ''} in your learning journey
          </p>
        </div>
      )}
    </div>
  )
}

export default SavedQuestions