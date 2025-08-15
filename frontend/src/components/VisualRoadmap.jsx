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

  // Convert learning path to nodes and edges
  useEffect(() => {
    if (!learningPath?.concepts || learningPath.concepts.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const concepts = learningPath.concepts;
    
    // Create nodes
    const newNodes = concepts.map((concept, index) => {
      const isTarget = concept.type === 'target';
      const isPrerequisite = concept.type === 'prerequisite';
      
      return {
        id: concept.id,
        position: { 
          x: index * 250, 
          y: Math.sin(index * 0.5) * 50 + 100 
        },
        data: { 
          label: concept.name,
          description: concept.description,
          type: concept.type,
          onClick: () => onNodeClick(concept.id)
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
    const newEdges = concepts.slice(0, -1).map((concept, index) => ({
      id: `e${concept.id}-${concepts[index + 1].id}`,
      source: concept.id,
      target: concepts[index + 1].id,
      animated: true,
      style: { 
        stroke: '#374151', 
        strokeWidth: 2 
      },
      type: 'smoothstep',
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [learningPath, onNodeClick]);

  // Handle node clicks
  const onNodeClickHandler = useCallback((event, node) => {
    if (node.data.onClick && !isLoading) {
      node.data.onClick();
    }
  }, [isLoading]);

  if (!learningPath?.concepts || learningPath.concepts.length === 0) {
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
          {learningPath.total_concepts} concepts • Click to explore
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