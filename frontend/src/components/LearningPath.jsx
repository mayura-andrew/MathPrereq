const LearningPath = ({ answer }) => {
  if (!answer) return null

  // Debug logging to see what data we're receiving
  console.log('LearningPath received answer:', answer)

  // Handle different possible API response structures
  const prerequisiteConcepts = answer.prerequisite_concepts || answer.prerequisites || answer.learning_path?.prerequisites || []
  const relatedConcepts = answer.related_concepts || answer.related || answer.learning_path?.related || []
  const nextConcepts = answer.next_concepts || answer.next_steps || answer.learning_path?.next_steps || []
  const identifiedConcepts = answer.identified_concepts || answer.key_concepts || []
  const learningPath = answer.learning_path || {}

  console.log('Learning path data:', {
    prerequisiteConcepts,
    relatedConcepts, 
    nextConcepts,
    identifiedConcepts,
    learningPath
  })

  const renderConceptList = (concepts, title, emoji) => {
    if (!concepts || concepts.length === 0) return null
    
    return (
      <div className="concept-section">
        <h3>{emoji} {title}</h3>
        <div className="concept-path">
          {concepts.map((concept, index) => (
            <div key={index} className="concept-node">
              <div className="concept-name">
                {typeof concept === 'string' ? concept : concept.name || concept.title}
              </div>
              {concept.description && (
                <div className="concept-description">
                  {concept.description}
                </div>
              )}
              {concept.difficulty && (
                <div className="concept-difficulty">
                  Difficulty: {concept.difficulty}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="learning-path">
      <div className="path-overview">
        <h3>📚 Your Learning Journey</h3>
        <p>
          Follow this path to build a strong foundation and advance your understanding.
        </p>
      </div>

      {/* Show identified concepts from the current query */}
      {identifiedConcepts && identifiedConcepts.length > 0 && (
        <div className="concept-section current-concept">
          <h3>🎯 Current Topics</h3>
          <div className="concept-path">
            {identifiedConcepts.map((concept, index) => (
              <div key={index} className="concept-node current">
                <div className="concept-name">
                  {typeof concept === 'string' ? concept : concept.name || concept.title}
                </div>
                <div className="concept-description">
                  This is what you're currently learning about.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {renderConceptList(prerequisiteConcepts, "Prerequisites", "📋")}
      
      {/* Show main concept if it exists separately from identified concepts */}
      {answer.main_concept && !identifiedConcepts?.some(c => 
        (typeof c === 'string' ? c : c.name) === (typeof answer.main_concept === 'string' ? answer.main_concept : answer.main_concept.name)
      ) && (
        <div className="concept-section current-concept">
          <h3>🎯 Main Concept</h3>
          <div className="concept-node current">
            <div className="concept-name">
              {typeof answer.main_concept === 'string' 
                ? answer.main_concept 
                : answer.main_concept.name || answer.main_concept.title
              }
            </div>
            <div className="concept-description">
              You are here! This is what you're currently learning.
            </div>
          </div>
        </div>
      )}

      {renderConceptList(relatedConcepts, "Related Concepts", "🔗")}
      {renderConceptList(nextConcepts, "What's Next", "⭐")}

      {/* Show learning path concepts if available */}
      {learningPath.concepts && learningPath.concepts.length > 0 && (
        <div className="concept-section">
          <h3>📈 Learning Progression</h3>
          <div className="concept-path">
            {learningPath.concepts.map((concept, index) => (
              <div key={index} className="concept-node">
                <div className="concept-name">
                  {typeof concept === 'string' ? concept : concept.name || concept.title}
                </div>
                {concept.description && (
                  <div className="concept-description">
                    {concept.description}
                  </div>
                )}
                {concept.difficulty && (
                  <div className="concept-difficulty">
                    Difficulty: {concept.difficulty}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {answer.difficulty_progression && (
        <div className="concept-section">
          <h3>📈 Difficulty Progression</h3>
          <div className="difficulty-path">
            {answer.difficulty_progression.map((level, index) => (
              <div key={index} className="difficulty-level">
                <div className="level-indicator">{index + 1}</div>
                <div className="level-content">
                  <div className="level-name">{level.name || level}</div>
                  {level.description && (
                    <div className="level-description">{level.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show a general message if no specific learning path data is available */}
      {!identifiedConcepts?.length && !prerequisiteConcepts?.length && !relatedConcepts?.length && !nextConcepts?.length && !learningPath?.concepts?.length && (
        <div className="concept-section">
          <h3>📚 Learning Suggestions</h3>
          <div className="concept-node">
            <div className="concept-name">Continue Exploring</div>
            <div className="concept-description">
              Based on your question, continue practicing similar problems and explore related mathematical concepts to deepen your understanding.
            </div>
          </div>
        </div>
      )}

      <div className="learning-tips">
        <h3>💡 Learning Tips</h3>
        <ul>
          <li>Practice regularly with different problem types</li>
          <li>Connect new concepts to what you already know</li>
          <li>Don't skip prerequisites - they're building blocks</li>
          <li>Apply concepts to real-world problems when possible</li>
        </ul>
      </div>
    </div>
  )
}

export default LearningPath