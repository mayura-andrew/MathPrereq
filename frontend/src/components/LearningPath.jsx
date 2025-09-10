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
  const [learningTabs, setLearningTabs] = useState([]) // Array of open tabs
  const [activeTabId, setActiveTabId] = useState(null) // Currently active tab
  const [loadingConcept, setLoadingConcept] = useState(false)
  const [searchingResources, setSearchingResources] = useState(false)
  const [searchedResources, setSearchedResources] = useState({}) // Store searched resources per tab
  
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
    // Check if tab already exists
    const existingTab = learningTabs.find(tab => tab.concept === concept.name)
    
    if (existingTab) {
      // Switch to existing tab
      setActiveTabId(existingTab.id)
      return
    }

    // Create new tab
    const tabId = Date.now().toString()
    const newTab = {
      id: tabId,
      concept: concept.name,
      difficulty: concept.difficulty,
      estimatedTime: concept.estimatedTime,
      description: concept.description,
      prerequisites: [],
      resources: [],
      examples: [],
      loading: true
    }

    // Add tab and set as active
    setLearningTabs(prev => [...prev, newTab])
    setActiveTabId(tabId)
    setLoadingConcept(true)

    try {
      // Get detailed concept information using the correct API endpoint
      const conceptDetail = await mathAPI.smartConceptQuery(concept.name)
      
      // Extract prerequisites from learning_path.concepts if available
      let prerequisites = conceptDetail.prerequisites || []
      
      // If no direct prerequisites, try to extract from learning_path
      if (!prerequisites.length && conceptDetail.learning_path?.concepts) {
        // Get all concepts except the current one as prerequisites
        prerequisites = conceptDetail.learning_path.concepts.filter(c => c.name !== concept.name)
      }
      
      // Update the specific tab with loaded data
      setLearningTabs(prev => prev.map(tab => 
        tab.id === tabId ? {
          ...tab,
          loading: false,
          explanation: conceptDetail.detailed_explanation || conceptDetail.explanation || conceptDetail.answer,
          prerequisites: prerequisites,
          examples: conceptDetail.examples || [],
          resources: conceptDetail.resources || [],
          leads_to: conceptDetail.leads_to || []
        } : tab
      ))
      
      // Debug logging to see what we received
      console.log('🔍 Concept detail received:', conceptDetail)
      console.log('📚 Prerequisites extracted:', prerequisites)
    } catch (error) {
      console.error('Failed to load concept details:', error)
      setLearningTabs(prev => prev.map(tab => 
        tab.id === tabId ? {
          ...tab,
          loading: false,
          error: 'Failed to load detailed information for this concept. Please try again.'
        } : tab
      ))
    } finally {
      setLoadingConcept(false)
    }
  }

  const closeTab = (tabId) => {
    const updatedTabs = learningTabs.filter(tab => tab.id !== tabId)
    setLearningTabs(updatedTabs)
    
    // If we closed the active tab, switch to another tab or close panel
    if (activeTabId === tabId) {
      if (updatedTabs.length > 0) {
        setActiveTabId(updatedTabs[updatedTabs.length - 1].id)
      } else {
        setActiveTabId(null)
      }
    }
  }

  const switchTab = (tabId) => {
    setActiveTabId(tabId)
  }

  const searchLearningResources = async (concept, tabId) => {
    setSearchingResources(true)
    
    try {
      // Make API request to search for learning resources using the new endpoint
      const searchResults = await mathAPI.findResourcesForConcept(concept)
      
      // Store searched resources for this tab
      setSearchedResources(prev => ({
        ...prev,
        [tabId]: searchResults.resources || searchResults.data || []
      }))
      
      console.log('🔍 Learning resources found:', searchResults)
    } catch (error) {
      console.error('Failed to search learning resources:', error)
      setSearchedResources(prev => ({
        ...prev,
        [tabId]: []
      }))
    } finally {
      setSearchingResources(false)
    }
  }

  const extractYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
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
    <div className={`learning-path-wrapper ${learningTabs.length > 0 ? 'panel-open' : ''}`}>
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
            // Handle different item structures - fix object rendering issue
            let concept, description, difficulty, estimatedTime
            
            if (typeof item === 'object' && item !== null) {
              // Handle object with id, name, description properties
              concept = item.name || item.concept || item.title || item.topic || `Concept ${index + 1}`
              description = item.description || item.explanation || item.details || ''
              difficulty = item.difficulty || item.level || 'Beginner'
              estimatedTime = item.estimated_time || item.time || item.duration || '10-15 min'
            } else if (typeof item === 'string') {
              // Handle string items
              concept = item
              description = ''
              difficulty = 'Beginner'
              estimatedTime = '10-15 min'
            } else {
              // Fallback for any other type
              concept = `Concept ${index + 1}`
              description = ''
              difficulty = 'Beginner' 
              estimatedTime = '10-15 min'
            }
            
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

      {/* Learning Side Panel with Tabs */}
      {learningTabs.length > 0 && (
        <div className="learning-side-panel">
          {/* Tab Navigation */}
          <div className="tabs-header">
            <div className="tabs-nav">
              {learningTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`tab-item ${activeTabId === tab.id ? 'active' : ''}`}
                  onClick={() => switchTab(tab.id)}
                >
                  <span className="tab-title">{tab.concept}</span>
                  <button
                    className="tab-close"
                    onClick={(e) => {
                      e.stopPropagation()
                      closeTab(tab.id)
                    }}
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Active Tab Content */}
          {(() => {
            const activeTab = learningTabs.find(tab => tab.id === activeTabId)
            if (!activeTab) return null

            return (
              <div className="tab-content">
                {activeTab.loading ? (
                  <div className="panel-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading {activeTab.concept} details...</p>
                  </div>
                ) : (
                  <>
                    {/* Concept Overview */}
                    <div className="concept-overview">
                      <div className="concept-meta">
                        <span 
                          className="difficulty-badge"
                          style={{ background: getDifficultyColor(activeTab.difficulty) }}
                        >
                          {activeTab.difficulty}
                        </span>
                        <span className="time-estimate">
                          <ClockIcon className="w-4 h-4" />
                          {activeTab.estimatedTime}
                        </span>
                      </div>
                      
                      {activeTab.description && (
                        <p className="concept-description">{activeTab.description}</p>
                      )}
                    </div>

                    {/* Detailed Explanation */}
                    {activeTab.explanation && (
                      <div className="concept-explanation">
                        <h4>Detailed Explanation</h4>
                        <div className="explanation-content">
                          {activeTab.explanation}
                        </div>
                      </div>
                    )}

                    {/* Prerequisites */}
                    {activeTab.prerequisites && activeTab.prerequisites.length > 0 ? (
                      <div className="prerequisites-section">
                        <h4>📚 Prerequisites</h4>
                        <p style={{ color: 'var(--edu-gray-600)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                          You should understand these concepts first:
                        </p>
                        <div className="prerequisites-list">
                          {activeTab.prerequisites.map((prereq, index) => {
                            const prereqName = typeof prereq === 'string' ? prereq : 
                                             prereq?.name || prereq?.title || `Prerequisite ${index + 1}`
                            const prereqDesc = typeof prereq === 'object' ? 
                                             prereq?.description || '' : ''
                            const prereqType = typeof prereq === 'object' ? 
                                             prereq?.type || 'concept' : 'concept'
                            
                            return (
                              <div key={index} className="prerequisite-item">
                                <ArrowRightIcon className="w-4 h-4" style={{ color: 'var(--edu-primary)' }} />
                                <div className="prerequisite-content">
                                  <span className="prerequisite-title">{prereqName}</span>
                                  {prereqDesc && (
                                    <span className="prerequisite-description">{prereqDesc}</span>
                                  )}
                                  <span className="prerequisite-type">{prereqType}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="no-prerequisites">
                        <p>No prerequisites found for this concept.</p>
                      </div>
                    )}

                    {/* Examples */}
                    {activeTab.examples && activeTab.examples.length > 0 && (
                      <div className="examples-section">
                        <h4>💡 Examples</h4>
                        <div className="examples-list">
                          {activeTab.examples.map((example, index) => {
                            const exampleText = typeof example === 'string' ? example : 
                                              example?.name || example?.title || example?.description || 
                                              `Example ${index + 1}`
                            return (
                              <div key={index} className="example-item">
                                <DocumentTextIcon className="w-4 h-4" />
                                <span>{exampleText}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Learning Resources */}
                    <div className="resources-section">
                      <div className="resources-header">
                        <h4>📖 Learning Resources</h4>
                        <button 
                          className="search-resources-btn"
                          onClick={() => searchLearningResources(activeTab.concept, activeTab.id)}
                          disabled={searchingResources}
                        >
                          {searchingResources ? (
                            <>
                              <div className="mini-spinner"></div>
                              Searching...
                            </>
                          ) : (
                            <>
                              🔍 Search More Resources
                            </>
                          )}
                        </button>
                      </div>

                      {/* API Resources */}
                      {activeTab.resources && activeTab.resources.length > 0 && (
                        <div className="resources-group">
                          <h5>📚 Curated Resources</h5>
                          <div className="resources-list">
                            {activeTab.resources.map((resource, index) => {
                              const youtubeId = extractYouTubeId(resource.url || '')
                              
                              if (youtubeId) {
                                return (
                                  <div key={index} className="youtube-resource">
                                    <div className="youtube-header">
                                      <PlayIcon className="w-4 h-4" />
                                      <span className="resource-title">{resource.title || resource.name}</span>
                                    </div>
                                    <div className="youtube-player">
                                      <iframe
                                        src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        title={resource.title || 'YouTube Video'}
                                      ></iframe>
                                    </div>
                                  </div>
                                )
                              }
                              
                              return (
                                <a 
                                  key={index}
                                  href={resource.url || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="resource-link"
                                >
                                  <div className="resource-icon">
                                    <GlobeAltIcon className="w-4 h-4" />
                                  </div>
                                  <div className="resource-content">
                                    <span className="resource-title">{resource.title || resource.name}</span>
                                    <span className="resource-type">{resource.type || 'Article'}</span>
                                  </div>
                                  <LinkIcon className="w-4 h-4 resource-external" />
                                </a>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Searched Resources */}
                      {searchedResources[activeTab.id] && searchedResources[activeTab.id].length > 0 && (
                        <div className="resources-group">
                          <h5>🔍 Search Results</h5>
                          <div className="resources-list">
                            {searchedResources[activeTab.id].map((resource, index) => {
                              const youtubeId = extractYouTubeId(resource.url || '')
                              
                              if (youtubeId) {
                                return (
                                  <div key={`search-${index}`} className="youtube-resource">
                                    <div className="youtube-header">
                                      <PlayIcon className="w-4 h-4" />
                                      <span className="resource-title">{resource.title || resource.name}</span>
                                    </div>
                                    <div className="youtube-player">
                                      <iframe
                                        src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        title={resource.title || 'YouTube Video'}
                                      ></iframe>
                                    </div>
                                  </div>
                                )
                              }
                              
                              return (
                                <a 
                                  key={`search-${index}`}
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
                                    {resource.description && (
                                      <span className="resource-description">{resource.description}</span>
                                    )}
                                  </div>
                                  <LinkIcon className="w-4 h-4 resource-external" />
                                </a>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Default Resources */}
                      {(!activeTab.resources || activeTab.resources.length === 0) && 
                       (!searchedResources[activeTab.id] || searchedResources[activeTab.id].length === 0) && (
                        <div className="no-resources">
                          <p>General study materials:</p>
                          <div className="general-resources">
                            <a href={`https://www.khanacademy.org/search?query=${encodeURIComponent(activeTab.concept)}`} 
                               target="_blank" rel="noopener noreferrer" className="resource-link">
                              <div className="resource-icon">
                                <GlobeAltIcon className="w-4 h-4" />
                              </div>
                              <div className="resource-content">
                                <span className="resource-title">Khan Academy</span>
                                <span className="resource-type">Educational Platform</span>
                              </div>
                              <LinkIcon className="w-4 h-4 resource-external" />
                            </a>
                            <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(activeTab.concept + ' math tutorial')}`} 
                               target="_blank" rel="noopener noreferrer" className="resource-link">
                              <div className="resource-icon">
                                <PlayIcon className="w-4 h-4" />
                              </div>
                              <div className="resource-content">
                                <span className="resource-title">YouTube Tutorials</span>
                                <span className="resource-type">Video Tutorials</span>
                              </div>
                              <LinkIcon className="w-4 h-4 resource-external" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* What This Enables (Leads To) */}
                    {activeTab.leads_to && activeTab.leads_to.length > 0 && (
                      <div className="leads-to-section">
                        <h4>🚀 What This Enables</h4>
                        <p style={{ color: 'var(--edu-gray-600)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                          Once you master this concept, you'll be ready to learn:
                        </p>
                        <div className="leads-to-list">
                          {activeTab.leads_to.map((nextConcept, index) => {
                            const conceptText = typeof nextConcept === 'string' ? nextConcept : 
                                              nextConcept?.name || nextConcept?.title || nextConcept?.description || 
                                              `Next Concept ${index + 1}`
                            const conceptDesc = typeof nextConcept === 'object' ? 
                                              nextConcept?.description || '' : ''
                            return (
                              <div key={index} className="leads-to-item">
                                <ArrowRightIcon className="w-4 h-4" style={{ color: 'var(--edu-secondary)' }} />
                                <div className="leads-to-content">
                                  <span className="leads-to-title">{conceptText}</span>
                                  {conceptDesc && (
                                    <span className="leads-to-description">{conceptDesc}</span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {activeTab.error && (
                      <div className="panel-error">
                        <p>{activeTab.error}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })()}
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