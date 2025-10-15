import { useState, useEffect, useCallback, useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Zoom from "@mui/material/Zoom";
import { styled, keyframes } from "@mui/material/styles";

import {
  RiSparklingLine,
  RiCloseLine,
  RiBookOpenLine,
  RiTimeLine,
  RiFocus3Line,
  RiNodeTree,
} from "react-icons/ri";

import ReactFlow, {
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Panel,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";

import type { StreamState } from "../types/streaming";
import type { PrerequisiteItem } from "../types/streaming";

// Animations
const pulseAnimation = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
  }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const NeuralContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  width: "100%",
  height: "600px",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  background: theme.palette.background.default,
  borderRadius: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
}));

const SidePanel = styled(Paper)(({ theme }) => ({
  position: "absolute",
  right: 0,
  top: 0,
  width: 380,
  height: "100%",
  zIndex: 100,
  overflow: "auto",
  borderLeft: `1px solid ${theme.palette.divider}`,
  boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
  animation: `${slideIn} 0.3s ease-out`,
}));

const StatsPanel = styled(Paper)(({ theme }) => ({
  position: "absolute",
  left: 16,
  top: 16,
  zIndex: 10,
  padding: theme.spacing(2),
  minWidth: 250,
  backdropFilter: "blur(8px)",
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  animation: `${slideIn} 0.5s ease-out`,
}));

function getDifficultyColor(difficulty?: string): string {
  switch (difficulty?.toLowerCase()) {
    case "beginner":
      return "#10b981";
    case "intermediate":
      return "#3b82f6";
    case "advanced":
      return "#f59e0b";
    default:
      return "#64748b";
  }
}

interface NodeData {
  id: string;
  name: string;
  description?: string;
  difficulty?: string;
  isTarget: boolean;
  isNew: boolean;
  timestamp: number;
}

// Custom Node Component with streaming animations
const StreamingNode = ({ data }: { data: any }) => {
  const { node, onNodeClick, isNew } = data;

  return (
    <Zoom in={true} timeout={500}>
      <Paper
        sx={{
          p: 2,
          borderRadius: 2,
          border: `2px solid ${getDifficultyColor(node.difficulty)}`,
          backgroundColor: node.isTarget ? "primary.main" : "background.paper",
          color: node.isTarget ? "common.white" : "text.primary",
          cursor: "pointer",
          minWidth: 160,
          textAlign: "center",
          boxShadow: node.isTarget
            ? "0 0 20px rgba(59, 130, 246, 0.5)"
            : "0 2px 8px rgba(0,0,0,0.1)",
          animation: isNew ? `${pulseAnimation} 1.5s ease-out` : "none",
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "scale(1.05)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          },
        }}
        onClick={() => onNodeClick(node)}
      >
        <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
          {node.name}
        </Typography>

        {node.isTarget && (
          <Chip
            label="Target"
            icon={<RiFocus3Line />}
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,0.2)",
              color: "inherit",
              fontSize: "0.7rem",
            }}
          />
        )}

        {node.difficulty && (
          <Chip
            label={node.difficulty}
            size="small"
            sx={{
              mt: 0.5,
              fontSize: "0.65rem",
              bgcolor: getDifficultyColor(node.difficulty),
              color: "white",
            }}
          />
        )}
      </Paper>
    </Zoom>
  );
};

const nodeTypes = {
  streaming: StreamingNode,
};

interface StreamingKnowledgeMapProps {
  streamState: StreamState;
  targetConcept?: string;
}

export default function StreamingKnowledgeMap({
  streamState,
  targetConcept,
}: StreamingKnowledgeMapProps) {
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeMap, setNodeMap] = useState<Map<string, NodeData>>(new Map());

  // Layout configuration
  const centerX = 500;
  const centerY = 300;
  const radiusX = 280;
  const radiusY = 200;

  // Handle node click
  const handleNodeClick = useCallback((node: NodeData) => {
    setSelectedNode(node);
    setSidePanelOpen(true);
  }, []);

  // Close side panel
  const closeSidePanel = useCallback(() => {
    setSidePanelOpen(false);
    setSelectedNode(null);
  }, []);

  // Process stream state and update graph
  useEffect(() => {
    const newNodeMap = new Map(nodeMap);
    let hasChanges = false;

    // Add target concept (if we have concepts from stream)
    if (streamState.concepts && streamState.concepts.length > 0) {
      const mainConcept = streamState.concepts[0];
      if (!newNodeMap.has(mainConcept)) {
        newNodeMap.set(mainConcept, {
          id: `concept-${mainConcept}`,
          name: mainConcept,
          isTarget: true,
          isNew: true,
          timestamp: Date.now(),
        });
        hasChanges = true;
      }
    } else if (targetConcept && !newNodeMap.has(targetConcept)) {
      // Fallback to targetConcept prop
      newNodeMap.set(targetConcept, {
        id: `concept-${targetConcept}`,
        name: targetConcept,
        isTarget: true,
        isNew: true,
        timestamp: Date.now(),
      });
      hasChanges = true;
    }

    // Add prerequisites as they arrive
    if (streamState.prerequisites && streamState.prerequisites.length > 0) {
      streamState.prerequisites.forEach((prereq: PrerequisiteItem) => {
        if (!newNodeMap.has(prereq.name)) {
          newNodeMap.set(prereq.name, {
            id: prereq.id || `prereq-${prereq.name}`,
            name: prereq.name,
            description: prereq.description,
            difficulty: prereq.difficulty_level,
            isTarget: false,
            isNew: true,
            timestamp: Date.now(),
          });
          hasChanges = true;
        }
      });
    }

    if (hasChanges) {
      setNodeMap(newNodeMap);
    }
  }, [streamState.concepts, streamState.prerequisites, targetConcept]);

  // Update React Flow nodes and edges when nodeMap changes
  useEffect(() => {
    if (nodeMap.size === 0) return;

    const nodeArray = Array.from(nodeMap.values());
    
    // Separate target and prerequisites
    const targetNodes = nodeArray.filter((n) => n.isTarget);
    const prereqNodes = nodeArray.filter((n) => !n.isTarget);

    // Create flow nodes with positions
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // Position target node(s) in center
    targetNodes.forEach((node, index) => {
      flowNodes.push({
        id: node.id,
        type: "streaming",
        position: { x: centerX, y: centerY + index * 100 },
        data: {
          node,
          onNodeClick: handleNodeClick,
          isNew: node.isNew && Date.now() - node.timestamp < 2000,
        },
        draggable: true,
      });
    });

    // Position prerequisites in an ellipse around the center
    const prereqCount = prereqNodes.length;
    prereqNodes.forEach((node, index) => {
      // Calculate angle for elliptical distribution
      const angle = (index / Math.max(1, prereqCount)) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radiusX;
      const y = centerY + Math.sin(angle) * radiusY;

      flowNodes.push({
        id: node.id,
        type: "streaming",
        position: { x, y },
        data: {
          node,
          onNodeClick: handleNodeClick,
          isNew: node.isNew && Date.now() - node.timestamp < 2000,
        },
        draggable: true,
      });

      // Create edges from prerequisites to target
      if (targetNodes.length > 0) {
        flowEdges.push({
          id: `${node.id}-${targetNodes[0].id}`,
          source: node.id,
          target: targetNodes[0].id,
          type: "smoothstep",
          animated: node.isNew && Date.now() - node.timestamp < 3000,
          style: {
            stroke: getDifficultyColor(node.difficulty),
            strokeWidth: 2,
          },
        });
      }
    });

    setNodes(flowNodes);
    setEdges(flowEdges);

    // Clear "isNew" flag after animation
    const timer = setTimeout(() => {
      setNodeMap((prev) => {
        const updated = new Map(prev);
        updated.forEach((node) => {
          if (node.isNew && Date.now() - node.timestamp > 2000) {
            updated.set(node.name, { ...node, isNew: false });
          }
        });
        return updated;
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [nodeMap, handleNodeClick]);

  // Statistics
  const stats = useMemo(() => {
    return {
      totalNodes: nodeMap.size,
      prerequisites: Array.from(nodeMap.values()).filter((n) => !n.isTarget).length,
      targets: Array.from(nodeMap.values()).filter((n) => n.isTarget).length,
      progress: streamState.progress || 0,
      stage: streamState.stage || "Initializing",
    };
  }, [nodeMap, streamState]);

  if (nodes.length === 0 && !streamState.isStreaming) {
    return (
      <NeuralContainer>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          height="100%"
        >
          <RiNodeTree size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
          <Typography variant="h6" color="text.secondary">
            Knowledge Map Loading...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ask a question to see the prerequisite knowledge map
          </Typography>
        </Box>
      </NeuralContainer>
    );
  }

  return (
    <NeuralContainer>
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        p={2}
        borderBottom={1}
        borderColor="divider"
        sx={{ bgcolor: "background.paper" }}
      >
        <Typography
          variant="h6"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <RiNodeTree />
          Live Knowledge Map
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          {streamState.isStreaming && (
            <Chip
              icon={<RiSparklingLine />}
              label="Streaming"
              color="primary"
              size="small"
              sx={{
                animation: `${pulseAnimation} 2s infinite`,
              }}
            />
          )}
          <Typography variant="body2" color="text.secondary">
            {stats.totalNodes} concept{stats.totalNodes !== 1 ? "s" : ""}
          </Typography>
        </Box>
      </Box>

      {/* React Flow Canvas */}
      <Box sx={{ flex: 1, position: "relative" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-right"
          minZoom={0.5}
          maxZoom={1.5}
        >
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const nodeData = node.data?.node as NodeData;
              return nodeData?.isTarget
                ? "#3b82f6"
                : getDifficultyColor(nodeData?.difficulty);
            }}
          />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />

          {/* Stats Panel */}
          {streamState.isStreaming && (
            <Panel position="top-left">
              <StatsPanel elevation={3}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
                  <RiTimeLine style={{ marginRight: 4, verticalAlign: "middle" }} />
                  Stream Progress
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    {stats.stage}
                  </Typography>
                  <Box
                    sx={{
                      mt: 0.5,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: "grey.200",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        width: `${stats.progress}%`,
                        bgcolor: "primary.main",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {Math.round(stats.progress)}%
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption">Prerequisites</Typography>
                    <Chip label={stats.prerequisites} size="small" color="info" />
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption">Target Concepts</Typography>
                    <Chip label={stats.targets} size="small" color="primary" />
                  </Box>
                </Box>
              </StatsPanel>
            </Panel>
          )}
        </ReactFlow>
      </Box>

      {/* Side Panel for Concept Details */}
      {sidePanelOpen && selectedNode && (
        <SidePanel>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            p={2}
            borderBottom={1}
            borderColor="divider"
          >
            <Box display="flex" alignItems="center" gap={1}>
              <RiBookOpenLine />
              <Typography variant="h6">{selectedNode.name}</Typography>
            </Box>
            <IconButton onClick={closeSidePanel} size="small">
              <RiCloseLine />
            </IconButton>
          </Box>

          <Box p={2}>
            {/* Concept Type */}
            <Box sx={{ mb: 2 }}>
              <Chip
                label={selectedNode.isTarget ? "Target Concept" : "Prerequisite"}
                color={selectedNode.isTarget ? "primary" : "secondary"}
                icon={selectedNode.isTarget ? <RiFocus3Line /> : <RiNodeTree />}
              />
              {selectedNode.difficulty && (
                <Chip
                  label={selectedNode.difficulty}
                  size="small"
                  sx={{
                    ml: 1,
                    bgcolor: getDifficultyColor(selectedNode.difficulty),
                    color: "white",
                  }}
                />
              )}
            </Box>

            {/* Description */}
            {selectedNode.description && (
              <Paper sx={{ p: 2, mb: 2, bgcolor: "background.default" }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Description
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedNode.description}
                </Typography>
              </Paper>
            )}

            {/* Concept Info */}
            <Paper sx={{ p: 2, bgcolor: "background.default" }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Why This Matters
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedNode.isTarget
                  ? "This is your target concept. Understanding all prerequisites will help you master this topic."
                  : "This prerequisite concept is essential for understanding the target concept. Master this first to build a strong foundation."}
              </Typography>
            </Paper>

            {/* Action Buttons */}
            <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
              <Button variant="outlined" fullWidth>
                Learn More
              </Button>
              <Button variant="contained" fullWidth>
                Find Resources
              </Button>
            </Box>
          </Box>
        </SidePanel>
      )}
    </NeuralContainer>
  );
}
