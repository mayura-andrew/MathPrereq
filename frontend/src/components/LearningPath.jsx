import React, { useState } from 'react'
import { 
  MapIcon, 
  AcademicCapIcon, 
  CheckCircleIcon,
  ArrowRightIcon,
  BookOpenIcon,
  ClockIcon,
  XMarkIcon,
  LinkIcon,
  PlayIcon,
  DocumentTextIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'
import { mathAPI } from '../services/api'

const LearningPath = ({ learningPath }) => {
  const [selectedStep, setSelectedStep] = useState(null)
  const [completedSteps, setCompletedSteps] = useState(new Set())
  const [learningPanel, setLearningPanel] = useState(null)
  const [loadingConcept, setLoadingConcept] = useState(false)
  
  console.log('LearningPath received:', learningPath) // Debug log

  if (!learningPath) {
    return (
      <div className="learning-path-container">
        <div className="learning-path-empty">
          <MapIcon className="empty-icon" />
          <h3>No Learning Path Available</h3>
          <p>Learning path data is not available for this question.</p>
        </div>
      </div>
    )
  }

  // Handle different data structures that might come from the API
  let pathData = []
  
  if (Array.isArray(learningPath)) {
    pathData = learningPath
  } else if (learningPath.concepts) {
    pathData = learningPath.concepts
  } else if (learningPath.prerequisites) {
    pathData = learningPath.prerequisites
  } else if (learningPath.steps) {
    pathData = learningPath.steps
  } else if (typeof learningPath === 'object') {
    // If it's an object, try to extract meaningful data
    pathData = Object.keys(learningPath).map(key => ({
      name: key,
      description: learningPath[key]
    }))
  }

  const startLearning = async (concept) => {
    setLoadingConcept(true)
    setLearningPanel({
      concept: concept.name,
      difficulty: concept.difficulty,
      estimatedTime: concept.estimatedTime,
      description: concept.description,
      prerequisites: [],
      resources: [],
      examples: []
    })

    try {
      // Get detailed concept information using the correct API endpoint
      const conceptDetail = await mathAPI.getConceptDetail(concept.name)
      
      setLearningPanel(prev => ({
        ...prev,
        explanation: conceptDetail.explanation || conceptDetail.answer,
        prerequisites: conceptDetail.prerequisites || [],
        examples: conceptDetail.examples || [],
        resources: conceptDetail.resources || []
      }))
    } catch (error) {
      console.error('Failed to load concept details:', error)
      setLearningPanel(prev => ({
        ...prev,
        error: 'Failed to load detailed information for this concept. Please try again.'
      }))
    } finally {
      setLoadingConcept(false)
    }
  }

  const closeLearningPanel = () => {
    setLearningPanel(null)
  }

  const toggleComplete = (stepId) => {
    const newCompleted = new Set(completedSteps)
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId)
    } else {
      newCompleted.add(stepId)
    }
    setCompletedSteps(newCompleted)
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'var(--edu-secondary)'
      case 'intermediate': return 'var(--edu-warning)'
      case 'advanced': return 'var(--edu-accent)'
      default: return 'var(--edu-gray-500)'
    }
  }

  if (!Array.isArray(pathData) || pathData.length === 0) {
    return (
      <div className="learning-path-container">
        <div className="learning-path-empty">
          <MapIcon className="empty-icon" />
          <h3>No Prerequisites Found</h3>
          <p>This topic doesn't have specific prerequisites listed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`learning-path-wrapper ${learningPanel ? 'panel-open' : ''}`}>
      <div className="learning-path-container">
        <div className="learning-path-header">
          <div className="header-icon">
            <MapIcon className="w-6 h-6" />
          </div>
          <div className="header-content">
            <h2>Learning Path</h2>
            <p>Master these concepts to understand this topic better</p>
          </div>
        </div>

        <div className="learning-path-content">
          {pathData.map((item, index) => {
            // Handle different item structures
            const concept = item.concept || item.name || item.title || item.topic || (typeof item === 'string' ? item : `Concept ${index + 1}`)
            const description = item.description || item.explanation || item.details || ''
            const difficulty = item.difficulty || item.level || 'Beginner'
            const estimatedTime = item.estimated_time || item.time || item.duration || '10-15 min'
            
            return (
              <div key={index} className="learning-step">
                <div className="step-indicator">
                  <div className="step-number">{index + 1}</div>
                  {index < pathData.length - 1 && (
                    <div className="step-connector"></div>
                  )}
                </div>
                
                <div className="step-content">
                  <div className="step-header">
                    <h3 
                      className="step-title clickable-title" 
                      onClick={() => setSelectedStep({
                        id: index,
                        name: concept,
                        description,
                        difficulty,
                        estimatedTime
                      })}
                    >
                      {concept}
                    </h3>
                    <div className="step-meta">
                      <span 
                        className="difficulty-badge"
                        style={{ background: getDifficultyColor(difficulty) }}
                      >
                        {difficulty}
                      </span>
                      <span className="time-estimate">
                        <ClockIcon className="w-4 h-4" />
                        {estimatedTime}
                      </span>
                    </div>
                  </div>
                  
                  {description && (
                    <p className="step-description">{description}</p>
                  )}
                  
                  <div className="step-actions">
                    <button 
                      className="study-button"
                      onClick={() => startLearning({
                        name: concept,
                        description,
                        difficulty,
                        estimatedTime
                      })}
                    >
                      <BookOpenIcon className="w-4 h-4" />
                      Start Learning
                    </button>
                    <button 
                      className={`mark-complete-button ${completedSteps.has(index) ? 'completed' : ''}`}
                      onClick={() => toggleComplete(index)}
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      {completedSteps.has(index) ? 'Completed' : 'Mark Complete'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {learningPath.summary && (
          <div className="learning-summary">
            <h3>Path Summary</h3>
            <p>{learningPath.summary}</p>
          </div>
        )}
      </div>

      {/* Learning Side Panel */}
      {learningPanel && (
        <div className="learning-side-panel">
          <div className="panel-header">
            <div className="panel-title">
              <BookOpenIcon className="w-6 h-6" />
              <h3>{learningPanel.concept}</h3>
            </div>
            <button 
              className="panel-close"
              onClick={closeLearningPanel}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="panel-content">
            {loadingConcept ? (
              <div className="panel-loading">
                <div className="loading-spinner"></div>
                <p>Loading concept details...</p>
              </div>
            ) : (
              <>
                {/* Concept Overview */}
                <div className="concept-overview">
                  <div className="concept-meta">
                    <span 
                      className="difficulty-badge"
                      style={{ background: getDifficultyColor(learningPanel.difficulty) }}
                    >
                      {learningPanel.difficulty}
                    </span>
                    <span className="time-estimate">
                      <ClockIcon className="w-4 h-4" />
                      {learningPanel.estimatedTime}
                    </span>
                  </div>
                  
                  {learningPanel.description && (
                    <p className="concept-description">{learningPanel.description}</p>
                  )}
                </div>

                {/* Detailed Explanation */}
                {learningPanel.explanation && (
                  <div className="concept-explanation">
                    <h4>Detailed Explanation</h4>
                    <div className="explanation-content">
                      {learningPanel.explanation}
                    </div>
                  </div>
                )}

                {/* Prerequisites */}
                {learningPanel.prerequisites && learningPanel.prerequisites.length > 0 && (
                  <div className="prerequisites-section">
                    <h4>Prerequisites</h4>
                    <div className="prerequisites-list">
                      {learningPanel.prerequisites.map((prereq, index) => (
                        <div key={index} className="prerequisite-item">
                          <ArrowRightIcon className="w-4 h-4" />
                          <span>{prereq}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Examples */}
                {learningPanel.examples && learningPanel.examples.length > 0 && (
                  <div className="examples-section">
                    <h4>Examples</h4>
                    <div className="examples-list">
                      {learningPanel.examples.map((example, index) => (
                        <div key={index} className="example-item">
                          <DocumentTextIcon className="w-4 h-4" />
                          <span>{example}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Learning Resources */}
                <div className="resources-section">
                  <h4>Learning Resources</h4>
                  {learningPanel.resources && learningPanel.resources.length > 0 ? (
                    <div className="resources-list">
                      {learningPanel.resources.map((resource, index) => (
                        <a 
                          key={index}
                          href={resource.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="resource-link"
                        >
                          <div className="resource-icon">
                            {resource.type === 'video' ? (
                              <PlayIcon className="w-4 h-4" />
                            ) : (
                              <GlobeAltIcon className="w-4 h-4" />
                            )}
                          </div>
                          <div className="resource-content">
                            <span className="resource-title">{resource.title || resource.name}</span>
                            <span className="resource-type">{resource.type || 'Article'}</span>
                          </div>
                          <LinkIcon className="w-4 h-4 resource-external" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="no-resources">
                      <p>No specific resources available. General study materials:</p>
                      <div className="general-resources">
                        <a href={`https://www.khanacademy.org/search?query=${encodeURIComponent(learningPanel.concept)}`} 
                           target="_blank" rel="noopener noreferrer" className="resource-link">
                          <GlobeAltIcon className="w-4 h-4" />
                          <span>Khan Academy</span>
                          <LinkIcon className="w-4 h-4 resource-external" />
                        </a>
                        <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(learningPanel.concept + ' math tutorial')}`} 
                           target="_blank" rel="noopener noreferrer" className="resource-link">
                          <PlayIcon className="w-4 h-4" />
                          <span>YouTube Tutorials</span>
                          <LinkIcon className="w-4 h-4 resource-external" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {learningPanel.error && (
                  <div className="panel-error">
                    <p>{learningPanel.error}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Step Detail Modal */}
      {selectedStep && (
        <div className="step-modal-overlay" onClick={() => setSelectedStep(null)}>
          <div className="step-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <AcademicCapIcon className="w-6 h-6" />
                <h3>{selectedStep.name}</h3>
              </div>
              <button 
                className="modal-close"
                onClick={() => setSelectedStep(null)}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="modal-content">
              <div className="step-details">
                <div className="detail-item">
                  <span className="detail-label">Difficulty:</span>
                  <span 
                    className="difficulty-badge"
                    style={{ background: getDifficultyColor(selectedStep.difficulty) }}
                  >
                    {selectedStep.difficulty}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Estimated Time:</span>
                  <span className="detail-value">{selectedStep.estimatedTime}</span>
                </div>
              </div>
              
              {selectedStep.description && (
                <div className="step-description-modal">
                  <h4>About this step:</h4>
                  <p>{selectedStep.description}</p>
                </div>
              )}
              
              <div className="modal-actions">
                <button 
                  className={`complete-modal-button ${completedSteps.has(selectedStep.id) ? 'completed' : ''}`}
                  onClick={() => toggleComplete(selectedStep.id)}
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  {completedSteps.has(selectedStep.id) ? 'Mark Incomplete' : 'Mark Complete'}
                </button>
                <button 
                  className="study-modal-button"
                  onClick={() => {
                    setSelectedStep(null)
                    startLearning({
                      name: selectedStep.name,
                      description: selectedStep.description,
                      difficulty: selectedStep.difficulty,
                      estimatedTime: selectedStep.estimatedTime
                    })
                  }}
                >
                  <AcademicCapIcon className="w-4 h-4" />
                  Start Learning
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LearningPath