
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  SparklesIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

const VisualRoadmap = ({ learningPath, question }) => {
  const [selectedConcept, setSelectedConcept] = useState(null)
  const [completedConcepts, setCompletedConcepts] = useState(new Set())
  const [nodes, setNodes] = useState([])
  const [draggedNode, setDraggedNode] = useState(null)
  const canvasRef = useRef(null)

  // Create organic neural network layout
  const processLearningPath = (data) => {
    if (!data) return []
    
    let pathData = []
    if (Array.isArray(data)) pathData = data
    else if (data.concepts) pathData = data.concepts
    else if (data.prerequisites) pathData = data.prerequisites
    else if (data.steps) pathData = data.steps
    else if (typeof data === 'object') {
      pathData = Object.keys(data).map(key => ({ name: key, description: data[key] }))
    }

    const centerX = 300
    const centerY = 250
    const canvasWidth = 600
    const canvasHeight = 500

    return pathData.map((item, index) => {
      // Create more organic, brain-like positioning
      let x, y
      
      if (index === 0) {
        // Central neuron
        x = centerX
        y = centerY
      } else {
        // Distribute other neurons more naturally
        const angle = (index * 137.5) * (Math.PI / 180) // Golden angle for natural distribution
        const radius = Math.sqrt(index) * 40 + 60 // Spiral outward
        const scatter = (Math.random() - 0.5) * 60 // Add some organic randomness
        
        x = centerX + Math.cos(angle) * radius + scatter
        y = centerY + Math.sin(angle) * radius + scatter * 0.7
        
        // Keep within bounds
        x = Math.max(60, Math.min(canvasWidth - 60, x))
        y = Math.max(60, Math.min(canvasHeight - 60, y))
      }
      
      return {
        id: index,
        name: item.concept || item.name || item.title || item.topic || 
              (typeof item === 'string' ? item : `Concept ${index + 1}`),
        description: item.description || item.explanation || '',
        difficulty: item.difficulty || item.level || 'Beginner',
        x,
        y,
        // Create connections based on proximity and relationships
        connections: [],
        size: Math.random() * 20 + 40, // Varying neuron sizes
        pulseDelay: Math.random() * 2 // For animation variety
      }
    })
  }

  // Calculate connections based on distance and semantic similarity
  const calculateConnections = (nodeList) => {
    return nodeList.map((node, i) => {
      const connections = []
      
      nodeList.forEach((otherNode, j) => {
        if (i !== j) {
          const distance = Math.sqrt(
            Math.pow(node.x - otherNode.x, 2) + Math.pow(node.y - otherNode.y, 2)
          )
          
          // Connect if reasonably close or if it's a central concept
          if (distance < 200 || i === 0 || j === 0) {
            connections.push({
              targetId: j,
              strength: Math.max(0.1, Math.min(1, 250 / distance)),
              distance
            })
          }
        }
      })
      
      return { ...node, connections }
    })
  }

  useEffect(() => {
    const processedNodes = processLearningPath(learningPath)
    const nodesWithConnections = calculateConnections(processedNodes)
    setNodes(nodesWithConnections)
  }, [learningPath])

  // Drag functionality
  const handleMouseDown = (e, nodeId) => {
    e.preventDefault()
    setDraggedNode(nodeId)
  }

  const handleMouseMove = useCallback((e) => {
    if (draggedNode !== null) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        
        setNodes(prev => {
          const updated = prev.map(node => 
            node.id === draggedNode ? { ...node, x, y } : node
          )
          // Recalculate connections when a node moves
          return calculateConnections(updated)
        })
      }
    }
  }, [draggedNode])

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null)
  }, [])

  useEffect(() => {
    if (draggedNode !== null) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggedNode, handleMouseMove, handleMouseUp])

  const toggleComplete = (conceptId) => {
    const newCompleted = new Set(completedConcepts)
    if (newCompleted.has(conceptId)) {
      newCompleted.delete(conceptId)
    } else {
      newCompleted.add(conceptId)
    }
    setCompletedConcepts(newCompleted)
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return '#10b981' // Green
      case 'intermediate': return '#f59e0b' // Amber
      case 'advanced': return '#ef4444' // Red
      default: return '#6b7280' // Gray
    }
  }

  if (nodes.length === 0) {
    return (
      <div className="neural-container">
        <div className="neural-empty">
          <div className="empty-neuron">
            <SparklesIcon className="w-8 h-8" />
          </div>
          <h3>No neural network available</h3>
          <p>Create connections by exploring concepts</p>
        </div>
      </div>
    )
  }

  return (
    <div className="neural-container">
      {/* Minimal Header */}
      <div className="neural-header">
        <h2>Neural Network</h2>
        <div className="neural-stats">
          <span>{completedConcepts.size}/{nodes.length}</span>
          <div className="neural-pulse"></div>
        </div>
      </div>

      {/* Neural Canvas */}
      <div className="neural-canvas" ref={canvasRef}>
        {/* Neural connections - SVG for smooth curves */}
        <svg className="neural-connections" viewBox="0 0 600 500">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {nodes.map((node) => 
            node.connections.map((connection) => {
              const targetNode = nodes.find(n => n.id === connection.targetId)
              if (!targetNode) return null
              
              // Create curved path for more organic look
              const midX = (node.x + targetNode.x) / 2 + (Math.random() - 0.5) * 50
              const midY = (node.y + targetNode.y) / 2 + (Math.random() - 0.5) * 30
              
              const isActive = completedConcepts.has(node.id) || completedConcepts.has(targetNode.id)
              
              return (
                <path
                  key={`${node.id}-${connection.targetId}`}
                  d={`M ${node.x} ${node.y} Q ${midX} ${midY} ${targetNode.x} ${targetNode.y}`}
                  stroke={isActive ? '#3b82f6' : '#e2e8f0'}
                  strokeWidth={connection.strength * 2}
                  fill="none"
                  opacity={isActive ? connection.strength * 0.8 : connection.strength * 0.3}
                  filter={isActive ? "url(#glow)" : "none"}
                  className="neural-connection"
                />
              )
            })
          )}
        </svg>

        {/* Neural Nodes */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className={`neural-node ${completedConcepts.has(node.id) ? 'active' : ''} ${draggedNode === node.id ? 'dragging' : ''}`}
            style={{
              left: node.x - node.size / 2,
              top: node.y - node.size / 2,
              width: node.size,
              height: node.size,
              backgroundColor: completedConcepts.has(node.id) 
                ? getDifficultyColor(node.difficulty) 
                : '#ffffff',
              borderColor: getDifficultyColor(node.difficulty),
              animationDelay: `${node.pulseDelay}s`
            }}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            onClick={() => setSelectedConcept(node)}
          >
            <div className="neural-core">
              <div className="concept-label">{node.name}</div>
              {completedConcepts.has(node.id) && (
                <div className="neural-activity"></div>
              )}
            </div>
            
            {/* Neural pulses for active nodes */}
            {completedConcepts.has(node.id) && (
              <div className="neural-pulse-ring"></div>
            )}
          </div>
        ))}
      </div>

      {/* Lightweight Modal */}
      {selectedConcept && (
        <div className="neural-modal" onClick={() => setSelectedConcept(null)}>
          <div className="modal-neuron" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-neural"
              onClick={() => setSelectedConcept(null)}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
            
            <div className="neuron-info">
              <div 
                className="neuron-indicator"
                style={{ backgroundColor: getDifficultyColor(selectedConcept.difficulty) }}
              ></div>
              
              <h3>{selectedConcept.name}</h3>
              
              {selectedConcept.description && (
                <p>{selectedConcept.description}</p>
              )}
              
              <button 
                className={`activate-button ${completedConcepts.has(selectedConcept.id) ? 'activated' : ''}`}
                onClick={() => toggleComplete(selectedConcept.id)}
              >
                {completedConcepts.has(selectedConcept.id) ? 'Neural pathway active' : 'Activate neural pathway'}
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
  )
}

export default VisualRoadmap

