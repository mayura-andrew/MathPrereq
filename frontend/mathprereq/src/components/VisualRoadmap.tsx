import React, { useState, useEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import { styled } from '@mui/material/styles';

// Icons (using MUI icons instead of Heroicons)
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DescriptionIcon from '@mui/icons-material/Description';
import type { Concept, LearningPath, } from '../types/api';
import { mathAPI } from '../services/api';

const NeuralContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  background: theme.palette.background.default,
}));

const NeuralCanvas = styled(Box)({
  position: 'relative',
  width: '100%',
  height: '100%',
  cursor: 'grab',
});

const NeuralNode = styled(Paper)<{ size: number; isActive: boolean; difficulty: string }>(
  ({ theme, size, isActive, difficulty }) => ({
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: `2px solid ${getDifficultyColor(difficulty)}`,
    backgroundColor: isActive ? getDifficultyColor(difficulty) : theme.palette.background.paper,
    color: isActive ? theme.palette.common.white : theme.palette.text.primary,
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'scale(1.1)',
      boxShadow: theme.shadows[8],
    },
    '&.dragging': {
      cursor: 'grabbing',
      zIndex: 1000,
    },
  })
);

const SidePanel = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  right: 0,
  top: 0,
  width: 400,
  height: '100%',
  zIndex: 100,
  overflow: 'auto',
  borderLeft: `1px solid ${theme.palette.divider}`,
}));

function getDifficultyColor(difficulty: string) {
  switch (difficulty?.toLowerCase()) {
    case 'beginner': return '#22c55e';
    case 'intermediate': return '#3b82f6';
    case 'advanced': return '#f59e0b';
    default: return '#64748b';
  }
}

type Node = {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  x: number;
  y: number;
  connections: { targetId: number; strength: number; distance: number }[];
  size: number;
  pulseDelay: number;
};

type ConceptDetails = {
  concept_name: string;
  difficulty: string;
  description: string;
  explanation?: string;
  prerequisites?: Concept[];
  examples?: string[];
  error?: string;
};

export default function VisualRoadmap({ learningPath }: { learningPath?: LearningPath }) {
  const [selectedConcept, setSelectedConcept] = useState<Node | null>(null);
  const [completedConcepts, setCompletedConcepts] = useState<Set<number>>(new Set());
  const [nodes, setNodes] = useState<Node[]>([]);
  const [draggedNode, setDraggedNode] = useState<number | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [loadingConcept, setLoadingConcept] = useState(false);
  const [conceptDetails, setConceptDetails] = useState<ConceptDetails | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const processLearningPath = (data: LearningPath | undefined): Node[] => {
    if (!data || !data.concepts) return [];

    const centerX = 300;
    const centerY = 250;
    const canvasWidth = 600;
    const canvasHeight = 500;

    return data.concepts.map((item, index) => {
      let x: number, y: number;

      if (index === 0) {
        x = centerX;
        y = centerY;
      } else {
        const angle = (index * 137.5) * (Math.PI / 180);
        const radius = Math.sqrt(index) * 40 + 60;
        const scatter = (Math.random() - 0.5) * 60;

        x = centerX + Math.cos(angle) * radius + scatter;
        y = centerY + Math.sin(angle) * radius + scatter * 0.7;

        x = Math.max(60, Math.min(canvasWidth - 60, x));
        y = Math.max(60, Math.min(canvasHeight - 60, y));
      }

      return {
        id: index,
        name: item.name,
        description: item.description,
        difficulty: item.difficulty_level || 'Beginner',
        x,
        y,
        connections: [],
        size: Math.random() * 20 + 40,
        pulseDelay: Math.random() * 2,
      };
    });
  };

  const calculateConnections = (nodeList: Node[]): Node[] => {
    return nodeList.map((node, i) => {
      const connections: { targetId: number; strength: number; distance: number }[] = [];

      nodeList.forEach((otherNode, j) => {
        if (i !== j) {
          const distance = Math.sqrt(Math.pow(node.x - otherNode.x, 2) + Math.pow(node.y - otherNode.y, 2));

          if (distance < 200 || i === 0 || j === 0) {
            connections.push({
              targetId: j,
              strength: Math.max(0.1, Math.min(1, 250 / distance)),
              distance,
            });
          }
        }
      });

      return { ...node, connections };
    });
  };

  useEffect(() => {
    const processedNodes = processLearningPath(learningPath);
    const nodesWithConnections = calculateConnections(processedNodes);
    setNodes(nodesWithConnections);
  }, [learningPath]);

  const handleMouseDown = (e: React.MouseEvent, nodeId: number) => {
    e.preventDefault();
    setDraggedNode(nodeId);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggedNode !== null && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setNodes(prev => {
        const updated = prev.map(node =>
          node.id === draggedNode ? { ...node, x, y } : node
        );
        return calculateConnections(updated);
      });
    }
  }, [draggedNode]);

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
  }, []);

  useEffect(() => {
    if (draggedNode !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedNode, handleMouseMove, handleMouseUp]);

  const toggleComplete = (conceptId: number) => {
    const newCompleted = new Set(completedConcepts);
    if (newCompleted.has(conceptId)) {
      newCompleted.delete(conceptId);
    } else {
      newCompleted.add(conceptId);
    }
    setCompletedConcepts(newCompleted);
  };

  const handleConceptClick = async (node: Node) => {
    if (draggedNode !== null) return;

    setSelectedConcept(node);
    setSidePanelOpen(true);
    setLoadingConcept(true);
    setConceptDetails(null);

    try {
      // Use real API call for concept details
      const conceptDetail = await mathAPI.smartConceptQuery(node.name, {
        includeResources: true,
        includeLearningPath: true,
        maxResources: 5,
      });

      // Extract prerequisites from learning_path.concepts if available
      let prerequisites: Concept[] = [];
      if (conceptDetail.learning_path?.concepts) {
        prerequisites = conceptDetail.learning_path.concepts.filter(c => c.name !== node.name);
      }

      setConceptDetails({
        concept_name: node.name,
        difficulty: node.difficulty,
        description: node.description,
        explanation: conceptDetail.explanation,
        prerequisites,
        examples: [], // Could be extracted from explanation if needed
        error: conceptDetail.success ? undefined : conceptDetail.error,
      });

      console.log('🔍 Neural concept detail loaded:', conceptDetail);
    } catch (error) {
      console.error('Failed to load concept details:', error);
      setConceptDetails({
        error: error instanceof Error ? error.message : 'Failed to load detailed information for this concept.',
        concept_name: node.name,
        difficulty: node.difficulty,
        description: node.description,
        explanation: undefined,
        prerequisites: [],
        examples: [],
      });
    } finally {
      setLoadingConcept(false);
    }
  };

  const closeSidePanel = () => {
    setSidePanelOpen(false);
    setSelectedConcept(null);
    setConceptDetails(null);
  };

  if (nodes.length === 0) {
    return (
      <NeuralContainer>
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
          <AutoAwesomeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6">No Knowledge Map available</Typography>
          <Typography variant="body2" color="text.secondary">Create connections by exploring concepts</Typography>
        </Box>
      </NeuralContainer>
    );
  }

  return (
    <NeuralContainer>
      <Box display="flex" alignItems="center" justifyContent="space-between" p={2} borderBottom={1} borderColor="divider">
        <Typography variant="h6">Knowledge Map</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2">{completedConcepts.size}/{nodes.length}</Typography>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', animation: 'pulse 2s infinite' }} />
        </Box>
      </Box>

      <NeuralCanvas ref={canvasRef}>
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          viewBox="0 0 600 500"
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {nodes.map((node) =>
            node.connections.map((connection) => {
              const targetNode = nodes.find(n => n.id === connection.targetId);
              if (!targetNode) return null;

              const midX = (node.x + targetNode.x) / 2 + (Math.random() - 0.5) * 50;
              const midY = (node.y + targetNode.y) / 2 + (Math.random() - 0.5) * 30;

              const isActive = completedConcepts.has(node.id) || completedConcepts.has(targetNode.id);

              return (
                <path
                  key={`${node.id}-${connection.targetId}`}
                  d={`M ${node.x} ${node.y} Q ${midX} ${midY} ${targetNode.x} ${targetNode.y}`}
                  stroke={isActive ? '#3b82f6' : '#e2e8f0'}
                  strokeWidth={connection.strength * 2}
                  fill="none"
                  opacity={isActive ? connection.strength * 0.8 : connection.strength * 0.3}
                  filter={isActive ? "url(#glow)" : "none"}
                />
              );
            })
          )}
        </svg>

        {nodes.map((node) => (
          <NeuralNode
            key={node.id}
            size={node.size}
            isActive={completedConcepts.has(node.id)}
            difficulty={node.difficulty}
            sx={{
              left: node.x - node.size / 2,
              top: node.y - node.size / 2,
              ...(draggedNode === node.id && { zIndex: 1000 }),
            }}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            onClick={() => handleConceptClick(node)}
            className={draggedNode === node.id ? 'dragging' : ''}
          >
            <Typography variant="caption" sx={{ fontSize: '0.7rem', textAlign: 'center' }}>
              {node.name}
            </Typography>
          </NeuralNode>
        ))}
      </NeuralCanvas>

      {sidePanelOpen && selectedConcept && (
        <SidePanel>
          <Box display="flex" alignItems="center" justifyContent="space-between" p={2} borderBottom={1} borderColor="divider">
            <Box display="flex" alignItems="center" gap={1}>
              <MenuBookIcon />
              <Typography variant="h6">{selectedConcept.name}</Typography>
            </Box>
            <IconButton onClick={closeSidePanel}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box p={2} sx={{ overflow: 'auto', flex: 1 }}>
            {loadingConcept ? (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height={200}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 1 }}>Loading {selectedConcept.name} details...</Typography>
              </Box>
            ) : conceptDetails ? (
              <>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Chip label={selectedConcept.difficulty} sx={{ bgcolor: getDifficultyColor(selectedConcept.difficulty), color: 'white' }} />
                  <Button
                    variant={completedConcepts.has(selectedConcept.id) ? 'contained' : 'outlined'}
                    startIcon={<CheckCircleIcon />}
                    onClick={() => toggleComplete(selectedConcept.id)}
                    size="small"
                  >
                    {completedConcepts.has(selectedConcept.id) ? 'Mastered' : 'Mark as Mastered'}
                  </Button>
                </Box>

                {selectedConcept.description && (
                  <Typography variant="body2" sx={{ mb: 2 }}>{selectedConcept.description}</Typography>
                )}

                {conceptDetails.explanation && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>Neural Pathway Analysis</Typography>
                    <Typography variant="body2">{conceptDetails.explanation}</Typography>
                  </Box>
                )}

                {conceptDetails.prerequisites && conceptDetails.prerequisites.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>Required Neural Connections</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Activate these neural pathways first:
                    </Typography>
                    {conceptDetails.prerequisites.map((prereq) => (
                      <Box key={prereq.id} display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                        <ArrowForwardIcon sx={{ color: 'primary.main' }} />
                        <Box>
                          <Typography variant="body2">{prereq.name}</Typography>
                          {prereq.description && (
                            <Typography variant="caption" color="text.secondary">{prereq.description}</Typography>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}

                {conceptDetails.examples && conceptDetails.examples.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>Neural Pattern Examples</Typography>
                    {conceptDetails.examples.map((example, index) => (
                      <Box key={index} display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                        <DescriptionIcon />
                        <Typography variant="body2">{example}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {conceptDetails.error && (
                  <Typography variant="body2" color="error.main">{conceptDetails.error}</Typography>
                )}
              </>
            ) : null}
          </Box>
        </SidePanel>
      )}
    </NeuralContainer>
  );
}
