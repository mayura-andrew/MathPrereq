import React, { useState, useEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import { styled } from '@mui/material/styles';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StarIcon from '@mui/icons-material/Star';
import type { Concept, LearningPath, } from '../types/api';
import { mathAPI } from '../services/api';

const NeuralContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: theme.palette.background.default,
}));

const NeuralCanvas = styled(Box)({
  position: 'relative',
  width: '100%',
  height: '100%',
  cursor: 'grab',
  background: 'radial-gradient(circle at center, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
  borderRadius: 12,
  boxShadow: 'inset 0 0 60px rgba(0,0,0,0.05), 0 4px 20px rgba(0,0,0,0.08)',
});

const NeuralNode = styled(Paper)<{ size: number; isActive: boolean; difficulty: string; isCenter: boolean }>(
  ({ theme, size, isActive, difficulty, isCenter }) => ({
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: isCenter ? `4px solid ${getDifficultyColor(difficulty)}` : `2px solid ${getDifficultyColor(difficulty)}`,
    backgroundColor: isActive ? getDifficultyColor(difficulty) : 
      isCenter ? theme.palette.background.paper : 'rgba(255,255,255,0.9)',
    color: isActive ? theme.palette.common.white : theme.palette.text.primary,
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: isActive 
      ? `0 0 30px ${getDifficultyColor(difficulty)}50, 0 8px 16px rgba(0,0,0,0.2)` 
      : isCenter 
        ? '0 4px 12px rgba(0,0,0,0.15)' 
        : '0 2px 8px rgba(0,0,0,0.1)',
    '&:hover': {
      transform: 'scale(1.1)',
      boxShadow: `0 0 25px ${getDifficultyColor(difficulty)}60, 0 6px 12px rgba(0,0,0,0.3)`,
      zIndex: 10,
    },
    '&.dragging': {
      cursor: 'grabbing',
      zIndex: 1000,
      transform: 'scale(1.05)',
    },
  })
);

const SidePanel = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  right: 0,
  top: 0,
  width: 420,
  height: '100%',
  zIndex: 100,
  overflow: 'auto',
  borderLeft: `1px solid ${theme.palette.divider}`,
  boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
}));

function getDifficultyColor(difficulty: string) {
  switch (difficulty?.toLowerCase()) {
    case 'beginner': return '#10b981'; // emerald
    case 'intermediate': return '#3b82f6'; // blue
    case 'advanced': return '#f59e0b'; // amber
    default: return '#64748b'; // slate
  }
}

interface APIResource {
  id: string;
  concept_id: string;
  concept_name: string;
  title: string;
  url: string;
  description: string;
  resource_type: string;
  source_domain: string;
  difficulty_level: string;
  quality_score: number;
  content_preview: string;
  scraped_at: string;
  language: string;
  duration: string;
  thumbnail_url: string;
  view_count: number;
  author_channel: string;
  tags: string[] | null;
  is_verified: boolean;
}

interface APIResponse {
  success: boolean;
  message: string;
  resources: APIResource[];
  total_found: number;
  request_id: string;
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
  isCenter: boolean;
  type: 'prerequisite' | 'target';
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
  const [conceptResources, setConceptResources] = useState<Record<string, APIResource[]>>({});
  const [loadingResources, setLoadingResources] = useState<Record<string, boolean>>({});
  const canvasRef = useRef<HTMLDivElement>(null);

  const processLearningPath = (data: LearningPath | undefined): Node[] => {
    if (!data || !data.concepts) return [];

    const canvasWidth = 1000;
    const canvasHeight = 700;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    const nodes: Node[] = [];
    const concepts = data.concepts;

    // Place center node (main target concept)
    if (concepts.length > 0) {
      const centerConcept = concepts.find(c => c.type === 'target') || concepts[0];
      nodes.push({
        id: 0,
        name: centerConcept.name,
        description: centerConcept.description,
        difficulty: centerConcept.difficulty_level || 'intermediate',
        x: centerX,
        y: centerY,
        connections: [],
        size: 70,
        pulseDelay: 0,
        isCenter: true,
        type: 'target',
      });
    }

    // Separate prerequisites and additional targets
    const prerequisites = concepts.filter(c => c.type === 'prerequisite');
    const additionalTargets = concepts.filter(c => c.type === 'target' && c !== concepts.find(c => c.type === 'target'));

    // Position prerequisites in a semi-circle on the left
    const prereqRadius = 250;
    const prereqAngleStep = Math.PI / Math.max(1, prerequisites.length + 1);
    const prereqStartAngle = Math.PI * 0.75; // Start from top-left

    prerequisites.forEach((concept, index) => {
      const angle = prereqStartAngle + (index * prereqAngleStep);
      const x = centerX + Math.cos(angle) * prereqRadius;
      const y = centerY + Math.sin(angle) * prereqRadius;

      nodes.push({
        id: nodes.length,
        name: concept.name,
        description: concept.description,
        difficulty: concept.difficulty_level || 'intermediate',
        x: Math.max(60, Math.min(canvasWidth - 60, x)),
        y: Math.max(60, Math.min(canvasHeight - 60, y)),
        connections: [],
        size: 50,
        pulseDelay: index * 0.5,
        isCenter: false,
        type: 'prerequisite',
      });
    });

    // Position additional targets in a semi-circle on the right
    const targetRadius = 250;
    const targetAngleStep = Math.PI / Math.max(1, additionalTargets.length + 1);
    const targetStartAngle = Math.PI * 1.75; // Start from top-right

    additionalTargets.forEach((concept, index) => {
      const angle = targetStartAngle + (index * targetAngleStep);
      const x = centerX + Math.cos(angle) * targetRadius;
      const y = centerY + Math.sin(angle) * targetRadius;

      nodes.push({
        id: nodes.length,
        name: concept.name,
        description: concept.description,
        difficulty: concept.difficulty_level || 'intermediate',
        x: Math.max(60, Math.min(canvasWidth - 60, x)),
        y: Math.max(60, Math.min(canvasHeight - 60, y)),
        connections: [],
        size: 50,
        pulseDelay: (prerequisites.length + index) * 0.5,
        isCenter: false,
        type: 'target',
      });
    });

    return nodes;
  };

  const calculateConnections = (nodeList: Node[], learningPathData?: LearningPath): Node[] => {
    if (!learningPathData?.concepts) return nodeList;

    const concepts = learningPathData.concepts as Concept[];

    // Map node name -> index
    const nodeIndexByName = new Map<string, number>();
    nodeList.forEach((n, idx) => nodeIndexByName.set(n.name, idx));

    // Robust extractor that handles multiple shapes without using `any`
    const extractPrereqNames = (concept: unknown): string[] => {
      if (!concept || typeof concept !== 'object') return [];
      const obj = concept as Record<string, unknown>;
      const fields = ['prerequisites', 'prereq', 'requires', 'required', 'depends_on', 'required_concepts', 'parents'];

      for (const f of fields) {
        const v = obj[f];
        if (Array.isArray(v)) {
          return v.map((item) => {
            if (item == null) return '';
            if (typeof item === 'string') return item;
            if (typeof item === 'number') return String(item);
            if (typeof item === 'object') {
              const it = item as Record<string, unknown>;
              if (typeof it.name === 'string') return it.name;
              if (it.id !== undefined) {
                const found = concepts.find(c => (c as unknown as Record<string, unknown>).id === it.id);
                return found?.name || '';
              }
            }
            return '';
          }).filter(Boolean);
        }
      }

      return [];
    };

    // Build map of prerequisite -> dependents
    const dependentMap = new Map<string, Set<string>>();
    for (const c of concepts) {
      const deps = extractPrereqNames(c);
      for (const p of deps) {
        if (!dependentMap.has(p)) dependentMap.set(p, new Set<string>());
        dependentMap.get(p)!.add(c.name);
      }
    }

    // Prepare empty connection lists
    const connectionsByNode: Array<{ targetId: number; strength: number; distance: number }[]> = nodeList.map(() => []);

    // Create directed edges from prerequisite -> dependent (explicit)
    nodeList.forEach((node, i) => {
      const dependents = dependentMap.get(node.name);
      if (!dependents) return;
      for (const depName of dependents) {
        const targetIdx = nodeIndexByName.get(depName);
        if (targetIdx !== undefined && targetIdx !== i) {
          const otherNode = nodeList[targetIdx];
          const distance = Math.hypot(node.x - otherNode.x, node.y - otherNode.y);
          connectionsByNode[i].push({ targetId: targetIdx, strength: 0.9, distance });
        }
      }
    });

    // Conservative fallback: sequential links between targets (adjacent in learningPath)
    const targetNamesInOrder = concepts.filter(c => c.type === 'target').map(c => c.name);
    for (let k = 0; k < targetNamesInOrder.length - 1; k++) {
      const fromName = targetNamesInOrder[k];
      const toName = targetNamesInOrder[k + 1];
      const fromIdx = nodeIndexByName.get(fromName);
      const toIdx = nodeIndexByName.get(toName);
      if (fromIdx !== undefined && toIdx !== undefined && fromIdx !== toIdx) {
        const dist = Math.hypot(nodeList[fromIdx].x - nodeList[toIdx].x, nodeList[fromIdx].y - nodeList[toIdx].y);
        // only add if not already present
        const exists = connectionsByNode[fromIdx].some(c => c.targetId === toIdx);
        if (!exists) connectionsByNode[fromIdx].push({ targetId: toIdx, strength: 0.6, distance: dist });
      }
    }

    // Ensure center node connects to its explicit prerequisites
    const centerNode = nodeList.find(n => n.isCenter);
    if (centerNode) {
      const centerConcept = concepts.find(c => c.name === centerNode.name);
      if (centerConcept) {
        const centerPrereqs = extractPrereqNames(centerConcept);
        for (const pName of centerPrereqs) {
          const pIdx = nodeIndexByName.get(pName);
          if (pIdx !== undefined && pIdx !== nodeList.indexOf(centerNode)) {
            const dist = Math.hypot(centerNode.x - nodeList[pIdx].x, centerNode.y - nodeList[pIdx].y);
            // prerequisite -> center
            connectionsByNode[pIdx].push({ targetId: nodeList.indexOf(centerNode), strength: 0.9, distance: dist });
          }
        }
      }
    }

    return nodeList.map((n, idx) => ({ ...n, connections: connectionsByNode[idx] }));
  };

  useEffect(() => {
    const processedNodes = processLearningPath(learningPath);
    const nodesWithConnections = calculateConnections(processedNodes, learningPath);
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
        return calculateConnections(updated, learningPath);
      });
    }
  }, [draggedNode, learningPath]);

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

  // Fetch resources for a specific concept
  const fetchConceptResources = async (conceptId: string, conceptName: string) => {
    setLoadingResources(prev => ({ ...prev, [conceptId]: true }));
    try {
      const response = await mathAPI.getResourcesForConcept(conceptName, {
        limit: 5,
        minQuality: 60,
      });
      
      let apiData: unknown = response;
      if (response && typeof response === 'object' && 'data' in response) {
        apiData = response.data;
      }
      
      let resources: APIResource[] = [];
      if (Array.isArray(apiData)) {
        resources = apiData as APIResource[];
      } else if (apiData && typeof apiData === 'object' && 'resources' in apiData) {
        resources = (apiData as APIResponse).resources || [];
      }
      
      setConceptResources(prev => ({ ...prev, [conceptId]: resources }));
    } catch (error) {
      console.error(`Failed to fetch resources for concept ${conceptName}:`, error);
      setConceptResources(prev => ({ ...prev, [conceptId]: [] }));
    } finally {
      setLoadingResources(prev => ({ ...prev, [conceptId]: false }));
    }
  };

  const handleConceptClick = async (node: Node) => {
    if (draggedNode !== null) return;

    setSelectedConcept(node);
    setSidePanelOpen(true);
    setLoadingConcept(true);
    setConceptDetails(null);

    try {
      const conceptDetail = await mathAPI.smartConceptQuery(node.name, {
        includeResources: true,
        includeLearningPath: true,
        maxResources: 5,
      });

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
        examples: [],
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
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          🧠 Neural Knowledge Map
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="body2" color="text.secondary">
            {completedConcepts.size}/{nodes.length} mastered
          </Typography>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main', animation: 'pulse 2s infinite' }} />
        </Box>
      </Box>

      <NeuralCanvas ref={canvasRef}>
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          viewBox="0 0 1000 700"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#6366f1" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {nodes.map((node) =>
            node.connections.map((connection) => {
              const targetNode = nodes.find(n => n.id === connection.targetId);
              if (!targetNode) return null;

              const isActive = completedConcepts.has(node.id) || completedConcepts.has(targetNode.id);
              const isCenterConnection = node.isCenter || targetNode.isCenter;

              return (
                <g key={`${node.id}-${connection.targetId}`}>
                  <path
                    d={`M ${node.x} ${node.y} Q ${(node.x + targetNode.x) / 2} ${(node.y + targetNode.y) / 2 - 30} ${targetNode.x} ${targetNode.y}`}
                    stroke={isActive ? '#3b82f6' : '#cbd5e1'}
                    strokeWidth={isCenterConnection ? connection.strength * 3 : connection.strength * 2}
                    fill="none"
                    opacity={isActive ? connection.strength * 0.9 : connection.strength * 0.4}
                    filter={isActive ? "url(#glow)" : "none"}
                    strokeDasharray={isCenterConnection ? "none" : "5,5"}
                  />
                  {isActive && (
                    <circle
                      cx={(node.x + targetNode.x) / 2}
                      cy={(node.y + targetNode.y) / 2 - 30}
                      r="3"
                      fill="#3b82f6"
                      opacity="0.8"
                    >
                      <animate
                        attributeName="opacity"
                        values="0.3;1;0.3"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                </g>
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
            isCenter={node.isCenter}
            sx={{
              left: node.x - node.size / 2,
              top: node.y - node.size / 2,
              ...(draggedNode === node.id && { zIndex: 1000 }),
            }}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            onClick={() => handleConceptClick(node)}
            className={draggedNode === node.id ? 'dragging' : ''}
          >
            <Box sx={{ textAlign: 'center', px: 1 }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: node.isCenter ? '0.75rem' : '0.65rem', 
                  fontWeight: node.isCenter ? 'bold' : 'medium',
                  lineHeight: 1.2,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {node.name}
              </Typography>
              {node.isCenter && (
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.8 }}>
                    🎯 Main Concept
                  </Typography>
                </Box>
              )}
            </Box>
          </NeuralNode>
        ))}

        {/* Legend */}
        <Box sx={{ position: 'absolute', bottom: 20, left: 20, bgcolor: 'rgba(255,255,255,0.9)', p: 2, borderRadius: 2, boxShadow: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Legend</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#10b981', border: '2px solid #10b981' }} />
              <Typography variant="caption">Beginner</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#3b82f6', border: '2px solid #3b82f6' }} />
              <Typography variant="caption">Intermediate</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#f59e0b', border: '2px solid #f59e0b' }} />
              <Typography variant="caption">Advanced</Typography>
            </Box>
          </Box>
        </Box>
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
                {/* Concept Header */}
                <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>
                    {selectedConcept?.name}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedConcept?.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={selectedConcept?.difficulty}
                      sx={{ bgcolor: getDifficultyColor(selectedConcept?.difficulty || 'intermediate'), color: 'white' }}
                    />
                    <Chip
                      label={selectedConcept?.type}
                      variant="outlined"
                      color={selectedConcept?.type === 'prerequisite' ? 'warning' : 'success'}
                    />
                    <Button
                      variant={completedConcepts.has(selectedConcept?.id || 0) ? 'contained' : 'outlined'}
                      startIcon={<CheckCircleIcon />}
                      onClick={() => toggleComplete(selectedConcept?.id || 0)}
                      size="small"
                    >
                      {completedConcepts.has(selectedConcept?.id || 0) ? 'Mastered' : 'Mark as Mastered'}
                    </Button>
                  </Box>
                </Box>

                {/* Concept Details */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Concept Overview
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedConcept?.description}
                  </Typography>

                  {/* Key Points */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                      Why this concept matters:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      This concept is fundamental to understanding advanced mathematical topics and enables complex problem-solving.
                    </Typography>
                  </Box>
                </Box>

                {/* Prerequisites Section */}
                {conceptDetails.prerequisites && conceptDetails.prerequisites.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      📚 Prerequisites
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {conceptDetails.prerequisites.map((prereq, prereqIndex) => (
                        <Box key={prereq.id} sx={{ pl: 2, borderLeft: 3, borderColor: 'warning.main', py: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {prereqIndex + 1}. {prereq.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {prereq.description}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Neural Pathway Analysis */}
                {conceptDetails.explanation && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>Neural Pathway Analysis</Typography>
                    <Typography variant="body2">{conceptDetails.explanation}</Typography>
                  </Box>
                )}

                {/* Fetch Resources Button */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={() => fetchConceptResources(selectedConcept?.id.toString() || '', selectedConcept?.name || '')}
                      disabled={loadingResources[selectedConcept?.id.toString() || '']}
                      startIcon={loadingResources[selectedConcept?.id.toString() || ''] ? <CircularProgress size={16} /> : <SearchIcon />}
                    >
                      {loadingResources[selectedConcept?.id.toString() || ''] ? 'Fetching Resources...' : 'Fetch Learning Resources'}
                    </Button>
                    {conceptResources[selectedConcept?.id.toString() || ''] && (
                      <Typography variant="caption" color="text.secondary">
                        {conceptResources[selectedConcept?.id.toString() || ''].length} resources found
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Concept-specific resources */}
                {conceptResources[selectedConcept?.id.toString() || ''] && conceptResources[selectedConcept?.id.toString() || ''].length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      🎥 Learning Resources for {selectedConcept?.name}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {conceptResources[selectedConcept?.id.toString() || ''].map((resource) => (
                        <ResourceCard key={resource.id} resource={resource} />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Loading state for concept resources */}
                {loadingResources[selectedConcept?.id.toString() || ''] && (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Fetching resources for {selectedConcept?.name}...
                    </Typography>
                  </Box>
                )}

                {conceptDetails?.error && (
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

// Resource Card Component with YouTube embedding
function ResourceCard({ resource }: { resource: APIResource }) {
  const [showVideo, setShowVideo] = useState(false);
  const videoId = resource.url ? getYouTubeVideoId(resource.url) : null;

  return (
    <Paper sx={{ p: 2, '&:hover': { boxShadow: 2 } }}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* Thumbnail/Play Button */}
        <Box sx={{ position: 'relative', minWidth: 120, height: 90 }}>
          {videoId && !showVideo ? (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                bgcolor: 'grey.300',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: 1,
              }}
              onClick={() => setShowVideo(true)}
            >
              <PlayArrowIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            </Box>
          ) : videoId && showVideo ? (
            <iframe
              width="120"
              height="90"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title={resource.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ borderRadius: 4 }}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                bgcolor: 'grey.300',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1,
              }}
            >
              {resource.resource_type === 'video' ? <PlayArrowIcon /> : <SearchIcon />}
            </Box>
          )}
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {resource.title}
          </Typography>

          {resource.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {resource.description}
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Chip
              label={resource.source_domain || 'youtube'}
              size="small"
              sx={{ bgcolor: getPlatformColor(resource.source_domain || 'youtube'), color: 'white' }}
            />
            <Chip label={resource.resource_type} size="small" variant="outlined" />
            <Chip
              label={resource.difficulty_level}
              size="small"
              color={
                resource.difficulty_level === 'beginner' ? 'success' :
                resource.difficulty_level === 'intermediate' ? 'warning' : 'error'
              }
              variant="outlined"
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {resource.duration && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon fontSize="small" />
                <Typography variant="caption">{resource.duration}</Typography>
              </Box>
            )}

            {resource.view_count && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <StarIcon fontSize="small" sx={{ color: 'warning.main' }} />
                <Typography variant="caption">{resource.view_count.toLocaleString()} views</Typography>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary">
              Quality: {Math.round(resource.quality_score * 100)}/100
            </Typography>
          </Box>

          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              variant="outlined"
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Resource
            </Button>
            {videoId && !showVideo && (
              <Button
                size="small"
                variant="contained"
                onClick={() => setShowVideo(true)}
                sx={{ ml: 1 }}
              >
                Watch Video
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

// Helper function for platform colors
function getPlatformColor(platform: string): string {
  switch (platform) {
    case 'youtube.com': return '#ff0000';
    case 'khan_academy': return '#14b866';
    case 'coursera': return '#0056d2';
    default: return '#64748b';
  }
}

// Helper function for YouTube video ID extraction
function getYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/s]{11})/);
  return match ? match[1] : null;
}
