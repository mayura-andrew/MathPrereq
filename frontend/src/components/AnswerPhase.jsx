import React, { useState } from 'react'
import { 
  BookmarkIcon, 
  ArrowLeftIcon,
  CheckCircleIcon,
  MapIcon,
  AcademicCapIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid'
import StepByStepAnswer from './StepByStepAnswer'
import TextualExplanation from './TextualExplanation'
import LearningPath from './LearningPath'
import VisualRoadmap from './VisualRoadmap'

const AnswerPhase = ({ question, answer, onSave, onNewQuestion, isSaved }) => {
  const [activeView, setActiveView] = useState('explanation')

  // Debug logging to help identify learning path issues
  console.log('AnswerPhase - Full answer object:', answer)
  console.log('AnswerPhase - Learning path data:', answer?.learning_path)
  console.log('AnswerPhase - Prerequisites data:', answer?.prerequisites)
  console.log('AnswerPhase - Concepts data:', answer?.concepts)

  const viewOptions = [
    {
      id: 'explanation',
      label: 'Step-by-Step',
      icon: AcademicCapIcon,
      description: 'Detailed solution'
    },
    {
      id: 'learning',
      label: 'Learning Path',
      icon: MapIcon,
      description: 'Prerequisites & concepts'
    },
    {
      id: 'visual',
      label: 'Visual Roadmap',
      icon: ChartBarIcon,
      description: 'Interactive concept map'
    }
  ]

  return (
    <div className="answer-phase-container">
      {/* Header Section */}
      <div className="answer-header">
        <div className="answer-nav">
          <button 
            onClick={onNewQuestion}
            className="nav-back-button"
            title="Ask new question"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>New Question</span>
          </button>
          
          <button 
            onClick={onSave}
            className={`save-button ${isSaved ? 'save-button-saved' : ''}`}
            title={isSaved ? 'Already saved' : 'Save this answer'}
          >
            {isSaved ? (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <BookmarkIcon className="w-5 h-5" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>

        <div className="question-display">
          <div className="question-icon">
            <AcademicCapIcon className="w-6 h-6" />
          </div>
          <h1 className="question-text">{question}</h1>
        </div>

        {/* View Tabs */}
        <div className="view-tabs">
          {viewOptions.map((view) => {
            const IconComponent = view.icon
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`view-tab ${activeView === view.id ? 'view-tab-active' : ''}`}
                title={view.description}
              >
                <IconComponent className="w-5 h-5" />
                <span>{view.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Section */}
      <div className="answer-content">
        {activeView === 'explanation' && (
          <div className="content-panel">
            <TextualExplanation response={answer} />
            {answer.explanation && (
              <StepByStepAnswer answer={answer} />
            )}
          </div>
        )}
        
        {activeView === 'learning' && (
          <div className="content-panel">
            {answer.learning_path ? (
              <LearningPath learningPath={answer.learning_path} />
            ) : answer.prerequisites ? (
              <LearningPath learningPath={answer.prerequisites} />
            ) : answer.concepts ? (
              <LearningPath learningPath={answer.concepts} />
            ) : (
              <div className="learning-path-container">
                <div className="learning-path-empty">
                  <MapIcon className="empty-icon" />
                  <h3>No Learning Path Available</h3>
                  <p>No learning path or prerequisites were generated for this question.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'visual' && (
          <div className="content-panel">
            <VisualRoadmap 
              learningPath={answer.learning_path || answer.prerequisites || answer.concepts || []} 
              question={question}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default AnswerPhase