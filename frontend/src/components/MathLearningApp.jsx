import { useState, useEffect } from 'react'
import NavigationBar from './NavigationBar'
import QuestionPhase from './QuestionPhase'
import AnswerPhase from './AnswerPhase'
import SavedQuestions from './SavedQuestions'
import { mathAPI } from '../services/api'

const MathLearningApp = () => {
  const [phase, setPhase] = useState('question') // 'question', 'answer', 'saved'
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [currentAnswer, setCurrentAnswer] = useState(null)
  const [savedItems, setSavedItems] = useState([])
  const [loading, setLoading] = useState(false)

  // Load saved items from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mathLearning_saved')
    if (saved) {
      setSavedItems(JSON.parse(saved))
    }
  }, [])

  // Save to localStorage
  const saveToStorage = (items) => {
    localStorage.setItem('mathLearning_saved', JSON.stringify(items))
    setSavedItems(items)
  }

  const handleQuestionSubmit = async (question) => {
    setCurrentQuestion(question)
    setLoading(true)
    try {
      const response = await mathAPI.queryWithResources(question)
      console.log('API Response:', response) // Debug log
      setCurrentAnswer(response)
      setPhase('answer')
    } catch (error) {
      console.error('Error processing question:', error)
      // Fallback to basic query if queryWithResources fails
      try {
        const fallbackResponse = await mathAPI.processQuery(question)
        console.log('Fallback API Response:', fallbackResponse)
        setCurrentAnswer(fallbackResponse)
        setPhase('answer')
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError)
        alert('Failed to process question. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSaveQuestion = () => {
    const newItem = {
      id: Date.now(),
      question: currentQuestion,
      answer: currentAnswer,
      savedAt: new Date().toISOString()
    }
    const updatedItems = [newItem, ...savedItems]
    saveToStorage(updatedItems)
  }

  const handleDeleteSaved = (id) => {
    const updatedItems = savedItems.filter(item => item.id !== id)
    saveToStorage(updatedItems)
  }

  const resetToQuestion = () => {
    setCurrentQuestion('')
    setCurrentAnswer(null)
    setPhase('question')
  }

  return (
    <div className="math-learning-app">
      <NavigationBar 
        activeTab={phase}
        onTabChange={setPhase}
        savedCount={savedItems.length}
        userProfile={{ name: "Student", avatar: "S" }}
      />

      <main className="app-main">
        {phase === 'question' && (
          <QuestionPhase
            onSubmit={handleQuestionSubmit}
            loading={loading}
            question={currentQuestion}
            setQuestion={setCurrentQuestion}
          />
        )}
        
        {phase === 'answer' && currentAnswer && (
          <AnswerPhase
            question={currentQuestion}
            answer={currentAnswer}
            onSave={handleSaveQuestion}
            onNewQuestion={resetToQuestion}
            isSaved={savedItems.some(item => item.question === currentQuestion)}
          />
        )}
        
        {phase === 'saved' && (
          <SavedQuestions
            savedItems={savedItems}
            onDelete={handleDeleteSaved}
            onViewAnswer={(item) => {
              setCurrentQuestion(item.question)
              setCurrentAnswer(item.answer)
              setPhase('answer')
            }}
          />
        )}
      </main>
    </div>
  )
}

export default MathLearningApp