import React from 'react';
import ModernMathRenderer from './ModernMathRenderer';
import { BookOpenIcon, AcademicCapIcon, LightBulbIcon } from '@heroicons/react/24/outline';

const StepByStepAnswer = ({ answer }) => {
  if (!answer) return null

  return (
    <div className="step-by-step-answer">
      {answer.summary && (
        <div className="answer-summary">
          <ModernMathRenderer content={answer.summary} />
        </div>
      )}

      {answer.explanation && (
        <div className="main-explanation">
          <div className="explanation-content bg-white">
            <ModernMathRenderer 
              content={typeof answer.explanation === 'string' 
                ? answer.explanation 
                : JSON.stringify(answer.explanation)
              }
              className="max-w-none"
            />
          </div>
        </div>
      )}

      {answer.steps && answer.steps.length > 0 && (
        <div className="steps-section">
          <h3>Step-by-Step Solution</h3>
          <div className="steps-container">
            {answer.steps.map((step, index) => (
              <div key={index} className="math-step">
                <div className="step-number">{index + 1}</div>
                <div className="step-content">
                  <h4 className="step-title">{step.title || `Step ${index + 1}`}</h4>
                  <div className="step-explanation">
                    <ModernMathRenderer content={step.explanation || step.content || step} />
                  </div>
                  {step.formula && (
                    <div className="step-formula">
                      <ModernMathRenderer content={`**Formula:** \`${step.formula}\``} />
                    </div>
                  )}
                  {step.example && (
                    <div className="step-example">
                      <ModernMathRenderer content={`**Example:** ${step.example}`} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {answer.mathematical_steps && answer.mathematical_steps.length > 0 && (
        <div className="steps-section">
          <h3>Mathematical Steps</h3>
          <div className="steps-container">
            {answer.mathematical_steps.map((step, index) => (
              <div key={index} className="math-step">
                <div className="step-number">{index + 1}</div>
                <div className="step-content">
                  <h4 className="step-title">{step.title || `Step ${index + 1}`}</h4>
                  <div className="step-explanation">
                    <ModernMathRenderer content={step.explanation || step.content || step} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {answer.key_concepts && answer.key_concepts.length > 0 && (
        <div className="concepts-section">
          <h3>Key Concepts</h3>
          <div className="concepts-grid">
            {answer.key_concepts.map((concept, index) => (
              <div key={index} className="concept-card">
                <h4>{concept.name || concept}</h4>
                {concept.description && (
                  <ModernMathRenderer content={concept.description} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {answer.educational_resources && answer.educational_resources.length > 0 && (
        <div className="resources-section">
          <h3>Additional Resources</h3>
          <div className="resources-list">
            {answer.educational_resources.slice(0, 5).map((resource, index) => (
              <a 
                key={index} 
                href={resource.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="resource-link"
              >
                <div className="resource-title">{resource.title}</div>
                <div className="resource-description">{resource.description}</div>
                <div className="resource-type">{resource.type}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default StepByStepAnswer