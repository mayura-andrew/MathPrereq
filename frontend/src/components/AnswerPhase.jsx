import { useState } from 'react'
import StepByStepAnswer from './StepByStepAnswer'
import VisualRoadmap from './VisualRoadmap'

const AnswerPhase = ({ question, answer, onSave, onNewQuestion, isSaved }) => {
  const [activeTab, setActiveTab] = useState('answer')

  return (
    <div className="answer-phase">
      <div className="answer-header">
        <button className="back-btn" onClick={onNewQuestion}>
          ← Ask New Question
        </button>
        <h2 className="question-title">{question}</h2>
        <button 
          className={`save-btn ${isSaved ? 'saved' : ''}`}
          onClick={onSave}
          disabled={isSaved}
        >
          {isSaved ? '✓ Saved' : '💾 Save'}
        </button>
      </div>

      <div className="answer-content">
        <div className="tab-navigation">
          <button
            className={activeTab === 'answer' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('answer')}
          >
            📝 Step-by-Step Answer
          </button>
          <button
            className={activeTab === 'path' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('path')}
          >
            🗺️ Learning Path
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'answer' && (
            <StepByStepAnswer answer={answer} />
          )}
          {activeTab === 'path' && (
            <VisualRoadmap 
              learningPath={answer} 
              onNodeClick={(nodeId) => console.log('Node clicked:', nodeId)}
              isLoading={false}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default AnswerPhase