import React, { useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MiniMap,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { MapIcon } from '@heroicons/react/24/outline';

const VisualRoadmap = ({ learningPath, onNodeClick, isLoading }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [concepts, setConcepts] = React.useState([]);

  // Convert learning path to nodes and edges
  useEffect(() => {
    console.log('VisualRoadmap received learningPath:', learningPath)
    
    // Handle different API response structures
    let processedConcepts = []
    
    if (learningPath?.concepts) {
      // If concepts array exists directly
      processedConcepts = learningPath.concepts
    } else if (learningPath?.identified_concepts) {
      // Create concepts from identified concepts
      processedConcepts = learningPath.identified_concepts.map((concept, index) => ({
        id: `concept-${index}`,
        name: typeof concept === 'string' ? concept : concept.name,
        type: index === learningPath.identified_concepts.length - 1 ? 'target' : 'prerequisite'
      }))
    } else if (learningPath?.learning_path?.concepts) {
      // Check nested learning_path structure
      processedConcepts = learningPath.learning_path.concepts
    } else {
      // Fallback: create concepts from available data
      const allConcepts = []
      
      // Add prerequisites
      if (learningPath?.prerequisites || learningPath?.prerequisite_concepts) {
        const prereqs = learningPath.prerequisites || learningPath.prerequisite_concepts
        prereqs.forEach((concept, index) => {
          allConcepts.push({
            id: `prereq-${index}`,
            name: typeof concept === 'string' ? concept : concept.name,
            type: 'prerequisite'
          })
        })
      }
      
      // Add current topic
      if (learningPath?.identified_concepts) {
        learningPath.identified_concepts.forEach((concept, index) => {
          allConcepts.push({
            id: `current-${index}`,
            name: typeof concept === 'string' ? concept : concept.name,
            type: 'target'
          })
        })
      }
      
      // Add related concepts
      if (learningPath?.related_concepts) {
        learningPath.related_concepts.forEach((concept, index) => {
          allConcepts.push({
            id: `related-${index}`,
            name: typeof concept === 'string' ? concept : concept.name,
            type: 'related'
          })
        })
      }
      
      processedConcepts = allConcepts
    }
    
    setConcepts(processedConcepts)
    console.log('Processing concepts for visualization:', processedConcepts)
    
    if (!processedConcepts || processedConcepts.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }
    
    // Create nodes
    const newNodes = processedConcepts.map((concept, index) => {
      const isTarget = concept.type === 'target';
      const isPrerequisite = concept.type === 'prerequisite';
      
      return {
        id: concept.id || `node-${index}`,
        position: { 
          x: index * 250, 
          y: Math.sin(index * 0.5) * 50 + 100 
        },
        data: { 
          label: concept.name || concept.title || concept,
          description: concept.description,
          type: concept.type,
          onClick: () => onNodeClick && onNodeClick(concept.id || `node-${index}`)
        },
        style: {
          background: isTarget ? '#3B82F6' : isPrerequisite ? '#10B981' : '#6B7280',
          color: 'white',
          border: '2px solid #1F2937',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          minWidth: '180px',
          textAlign: 'center',
        },
        type: 'default',
      };
    });

    // Create edges connecting the concepts
    const newEdges = processedConcepts.slice(0, -1).map((concept, index) => {
      const sourceId = concept.id || `node-${index}`;
      const targetId = processedConcepts[index + 1].id || `node-${index + 1}`;
      
      return {
        id: `e${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        animated: true,
        style: { 
          stroke: '#374151', 
          strokeWidth: 2 
        },
        type: 'smoothstep',
      };
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [learningPath, onNodeClick]);

  // Handle node clicks
  const onNodeClickHandler = useCallback((event, node) => {
    if (node.data.onClick && !isLoading) {
      node.data.onClick();
    }
  }, [isLoading]);

  if (!learningPath || 
      (!learningPath.concepts && 
       !learningPath.identified_concepts && 
       !learningPath.prerequisites && 
       !learningPath.related_concepts)) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <MapIcon className="h-6 w-6 text-gray-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">Learning Roadmap</h2>
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <MapIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Submit a question to see your personalized learning roadmap</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <MapIcon className="h-6 w-6 text-blue-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">
            Interactive Learning Roadmap
          </h2>
        </div>
        <div className="text-sm text-gray-600">
          {concepts.length} concepts • Click to explore
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center space-x-4 mb-4 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
          <span>Prerequisites</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
          <span>Target Concept</span>
        </div>
      </div>
      
      <div className="h-96 border-2 border-gray-200 rounded-lg relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClickHandler}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="top-right"
        >
          <Controls />
          <Background color="#f3f4f6" gap={12} size={1} />
          <MiniMap 
            nodeColor={(node) => {
              if (node.data?.type === 'target') return '#3B82F6';
              if (node.data?.type === 'prerequisite') return '#10B981';
              return '#6B7280';
            }}
            maskColor="rgba(255, 255, 255, 0.6)"
            position="top-left"
          />
        </ReactFlow>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>
          💡 <strong>Tip:</strong> Click on any concept to get detailed information and explore its prerequisites.
          The roadmap shows the optimal learning sequence from foundational concepts to your target topic.
        </p>
      </div>
    </div>
  );
};

export default VisualRoadmap;