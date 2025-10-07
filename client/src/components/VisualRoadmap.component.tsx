import { useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import { styled } from "@mui/material/styles";

import {
  RiSparklingLine,
  RiCloseLine,
  RiCheckboxCircleLine,
  RiBookOpenLine,
  RiSearchLine,
  RiPlayFill,
  RiTimeLine,
  RiStarLine,
} from "react-icons/ri";

import ReactFlow, {
  type Node,
  type Edge,
  addEdge,
  type Connection,
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

import type { Concept, LearningPath, EducationalResource } from "../types/api";
import { mathAPI } from "../services/api";
import ReactMarkdown from "react-markdown";

const NeuralContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  background: theme.palette.background.default,
}));

const SidePanel = styled(Paper)(({ theme }) => ({
  position: "absolute",
  right: 0,
  top: 0,
  width: 420,
  height: "100%",
  zIndex: 100,
  overflow: "auto",
  borderLeft: `1px solid ${theme.palette.divider}`,
  boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
}));

function getDifficultyColor(difficulty: string) {
  switch (difficulty?.toLowerCase()) {
    case "beginner":
      return "#10b981"; // emerald
    case "intermediate":
      return "#3b82f6"; // blue
    case "advanced":
      return "#f59e0b"; // amber
    default:
      return "#64748b"; // slate
  }
}

// Custom Node Component
const CustomNode = ({ data }: { data: any }) => {
  const { 
    node, 
    onNodeClick, 
    completedConcepts, 
    toggleComplete,
    onExpandPrerequisites,
    isExpanding 
  } = data;
  const isCompleted = completedConcepts.has(node.id);

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 2,
        border: `2px solid ${getDifficultyColor(node.difficulty)}`,
        backgroundColor: isCompleted
          ? getDifficultyColor(node.difficulty)
          : "background.paper",
        color: isCompleted ? "common.white" : "text.primary",
        cursor: "pointer",
        minWidth: 140,
        textAlign: "center",
        boxShadow: isCompleted
          ? "0 0 20px rgba(59, 130, 246, 0.5)"
          : "0 2px 8px rgba(0,0,0,0.1)",
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "scale(1.05)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        },
        position: "relative",
        opacity: isExpanding ? 0.6 : 1,
      }}
      onClick={() => onNodeClick(node)}
    >
      {/* React Flow handles to allow edges to connect and render */}
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      
      <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
        {node.name}
      </Typography>
      
      {node.isCenter && (
        <Chip
          label="Main Concept"
          icon={<span>🎯</span>}
          size="small"
          color="primary"
          sx={{ mt: 0.5, mb: 1, fontSize: "0.7rem" }}
        />
      )}
      
      {node.isExpanded && (
        <Chip
          label="Expanded"
          icon={<span>✨</span>}
          size="small"
          color="success"
          variant="outlined"
          sx={{ mt: 0.5, mb: 1, fontSize: "0.65rem" }}
        />
      )}
      
      <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {/* <Button
          size="small"
          variant={isCompleted ? "contained" : "outlined"}
          onClick={(e) => {
            e.stopPropagation();
            toggleComplete(node.id);
          }}
          startIcon={isCompleted ? <span>✅</span> : <span>⭐</span>}
          sx={{ 
            fontSize: "0.7rem",
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          {isCompleted ? "Mastered" : "Mark Complete"}
        </Button> */}
        
        {/* {!node.isExpanded && (
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onExpandPrerequisites(node);
            }}
            disabled={isExpanding}
            startIcon={
              isExpanding ? (
                <CircularProgress size={14} />
              ) : (
                <span style={{ fontSize: '1rem' }}>🔍</span>
              )
            }
            sx={{ 
              fontSize: "0.7rem",
              textTransform: 'none',
              fontWeight: 500,
              borderStyle: 'dashed',
              '&:hover': {
                borderStyle: 'solid',
                bgcolor: 'secondary.light',
                transform: 'scale(1.02)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            {isExpanding ? "Loading..." : "Discover Prerequisites"}
          </Button>
        )} */}
      </Box>
    </Paper>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

type NodeData = {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  connections: { targetId: number; strength: number; distance: number }[];
  size: number;
  pulseDelay: number;
  isCenter: boolean;
  type: "prerequisite" | "target";
  x: number;
  y: number;
  isExpanded?: boolean; // Track if prerequisites are already loaded
};

export default function VisualRoadmap({
  learningPath,
}: {
  learningPath?: LearningPath;
}) {
  const [selectedConcept, setSelectedConcept] = useState<NodeData | null>(null);
  const [completedConcepts, setCompletedConcepts] = useState<Set<number>>(
    new Set()
  );
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [loadingConcept, setLoadingConcept] = useState(false);
  const [conceptDetails, setConceptDetails] = useState<any>(null);
  const [conceptResources, setConceptResources] = useState<
    Record<string, any[]>
  >({});
  const [loadingResources, setLoadingResources] = useState<
    Record<string, boolean>
  >({});
  const [expandingConcept, setExpandingConcept] = useState<string | null>(null);
  const [allNodesData, setAllNodesData] = useState<NodeData[]>([]);
  const [nextNodeId, setNextNodeId] = useState(0);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const resetEdgeStyles = useCallback(() => {
    setEdges((eds) =>
      eds.map((e) => {
        const srcNode = nodes.find((n) => n.id === e.source);
        const tgtNode = nodes.find((n) => n.id === e.target);
        const srcCenter = (srcNode as any)?.data?.node?.isCenter;
        const tgtCenter = (tgtNode as any)?.data?.node?.isCenter;

        const animated = false;
        const stroke = animated ? "#3b82f6" : "#cbd5e1";
        const strokeWidth = srcCenter || tgtCenter ? 3 : 2;
        return {
          ...e,
          hidden: false,
          animated,
          style: { ...(e.style || {}), stroke, strokeWidth },
        };
      })
    );
  }, [nodes, completedConcepts, setEdges]);

  const highlightEdgesForNode = useCallback(
    (nodeId: number) => {
      setEdges((eds) =>
        eds.map((e) => {
          const isConnected =
            e.source === String(nodeId) || e.target === String(nodeId);
          const srcNode = nodes.find((n) => n.id === e.source);
          const tgtNode = nodes.find((n) => n.id === e.target);
          const srcCenter = (srcNode as any)?.data?.node?.isCenter;
          const tgtCenter = (tgtNode as any)?.data?.node?.isCenter;

          const animated = isConnected;
          const stroke = isConnected ? "#0ea5e9" : "#e5e7eb";
          const strokeWidth = isConnected ? 3 : 1;
          const extraWidth = srcCenter || tgtCenter ? 1 : 0; 
          return {
            ...e,
            hidden: false,
            animated,
            style: {
              ...(e.style || {}),
              stroke,
              strokeWidth: strokeWidth + extraWidth,
              opacity: isConnected ? 1 : 0.35,
            },
          };
        })
      );
    },
    [nodes, setEdges]
  );

  const processLearningPath = (data: LearningPath): NodeData[] => {
    if (!data || !data.concepts) return [];

    const canvasWidth = 1000;
    const canvasHeight = 700;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    const nodes: NodeData[] = [];
    const concepts = data.concepts;

    // Place center node (main target concept)
    if (concepts.length > 0) {
      const centerConcept =
        concepts.find((c) => c.type === "target") || concepts[0];
      nodes.push({
        id: 0,
        name: centerConcept.name,
        description: centerConcept.description,
        difficulty: centerConcept.difficulty_level || "intermediate",
        x: centerX,
        y: centerY,
        connections: [],
        size: 70,
        pulseDelay: 0,
        isCenter: true,
        type: "target",
      });
    }

    // Separate prerequisites and additional targets
    const prerequisites = concepts.filter((c) => c.type === "prerequisite");
    const additionalTargets = concepts.filter(
      (c) =>
        c.type === "target" && c !== concepts.find((c) => c.type === "target")
    );

    // Position prerequisites in a semi-circle on the left
    const prereqRadius = 250;
    const prereqAngleStep = Math.PI / Math.max(1, prerequisites.length + 1);
    const prereqStartAngle = Math.PI * 0.75; // Start from top-left

    prerequisites.forEach((concept, index) => {
      const angle = prereqStartAngle + index * prereqAngleStep;
      const x = centerX + Math.cos(angle) * prereqRadius;
      const y = centerY + Math.sin(angle) * prereqRadius;

      nodes.push({
        id: nodes.length,
        name: concept.name,
        description: concept.description,
        difficulty: concept.difficulty_level || "intermediate",
        x: Math.max(60, Math.min(canvasWidth - 60, x)),
        y: Math.max(60, Math.min(canvasHeight - 60, y)),
        connections: [],
        size: 50,
        pulseDelay: index * 0.5,
        isCenter: false,
        type: "prerequisite",
      });
    });

    // Position additional targets in a semi-circle on the right
    const targetRadius = 250;
    const targetAngleStep = Math.PI / Math.max(1, additionalTargets.length + 1);
    const targetStartAngle = Math.PI * 1.75; // Start from top-right

    additionalTargets.forEach((concept, index) => {
      const angle = targetStartAngle + index * targetAngleStep;
      const x = centerX + Math.cos(angle) * targetRadius;
      const y = centerY + Math.sin(angle) * targetRadius;

      nodes.push({
        id: nodes.length,
        name: concept.name,
        description: concept.description,
        difficulty: concept.difficulty_level || "intermediate",
        x: Math.max(60, Math.min(canvasWidth - 60, x)),
        y: Math.max(60, Math.min(canvasHeight - 60, y)),
        connections: [],
        size: 50,
        pulseDelay: (prerequisites.length + index) * 0.5,
        isCenter: false,
        type: "target",
      });
    });

    return nodes;
  };

  const calculateConnections = (
    nodeList: NodeData[],
    learningPathData?: LearningPath
  ): NodeData[] => {
    if (!learningPathData?.concepts) return nodeList;

    const concepts = learningPathData.concepts as Concept[];

    // Map node name -> index
    const nodeIndexByName = new Map<string, number>();
    nodeList.forEach((n, idx) => nodeIndexByName.set(n.name, idx));

    // Robust extractor that handles multiple shapes without using `any`
    const extractPrereqNames = (concept: unknown): string[] => {
      if (!concept || typeof concept !== "object") return [];
      const obj = concept as Record<string, unknown>;
      const fields = [
        "prerequisites",
        "prereq",
        "requires",
        "required",
        "depends_on",
        "required_concepts",
        "parents",
      ];

      for (const f of fields) {
        const v = obj[f];
        if (Array.isArray(v)) {
          return v
            .map((item) => {
              if (item == null) return "";
              if (typeof item === "string") return item;
              if (typeof item === "number") return String(item);
              if (typeof item === "object") {
                const it = item as Record<string, unknown>;
                if (typeof it.name === "string") return it.name;
                if (it.id !== undefined) {
                  const found = concepts.find(
                    (c) =>
                      (c as unknown as Record<string, unknown>).id === it.id
                  );
                  return found?.name || "";
                }
              }
              return "";
            })
            .filter(Boolean);
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
    const connectionsByNode: Array<
      { targetId: number; strength: number; distance: number }[]
    > = nodeList.map(() => []);

    // Create directed edges from prerequisite -> dependent (explicit)
    nodeList.forEach((node, i) => {
      const dependents = dependentMap.get(node.name);
      if (!dependents) return;
      for (const depName of dependents) {
        const targetIdx = nodeIndexByName.get(depName);
        if (targetIdx !== undefined && targetIdx !== i) {
          const otherNode = nodeList[targetIdx];
          const distance = Math.hypot(
            node.x - otherNode.x,
            node.y - otherNode.y
          );
          connectionsByNode[i].push({
            targetId: targetIdx,
            strength: 0.9,
            distance,
          });
        }
      }
    });

    // Conservative fallback: sequential links between targets (adjacent in learningPath)
    const targetNamesInOrder = concepts
      .filter((c) => c.type === "target")
      .map((c) => c.name);
    for (let k = 0; k < targetNamesInOrder.length - 1; k++) {
      const fromName = targetNamesInOrder[k];
      const toName = targetNamesInOrder[k + 1];
      const fromIdx = nodeIndexByName.get(fromName);
      const toIdx = nodeIndexByName.get(toName);
      if (fromIdx !== undefined && toIdx !== undefined && fromIdx !== toIdx) {
        const dist = Math.hypot(
          nodeList[fromIdx].x - nodeList[toIdx].x,
          nodeList[fromIdx].y - nodeList[toIdx].y
        );
        // only add if not already present
        const exists = connectionsByNode[fromIdx].some(
          (c) => c.targetId === toIdx
        );
        if (!exists)
          connectionsByNode[fromIdx].push({
            targetId: toIdx,
            strength: 0.6,
            distance: dist,
          });
      }
    }

    // Add fallback connections if no explicit connections exist
    let totalConnectionsAdded = 0;
    connectionsByNode.forEach(
      (connections) => (totalConnectionsAdded += connections.length)
    );

    // If there are very few or no connections, create a basic network structure
    if (
      totalConnectionsAdded === 0 ||
      totalConnectionsAdded < nodeList.length - 1
    ) {
      console.log(
        "Adding fallback connections - current total:",
        totalConnectionsAdded
      );

      // Connect all prerequisites to the center node
      const centerIdx = nodeList.findIndex((n) => n.isCenter);
      if (centerIdx !== -1) {
        nodeList.forEach((node, idx) => {
          if (node.type === "prerequisite" && idx !== centerIdx) {
            const exists = connectionsByNode[idx].some(
              (c) => c.targetId === centerIdx
            );
            if (!exists) {
              const dist = Math.hypot(
                node.x - nodeList[centerIdx].x,
                node.y - nodeList[centerIdx].y
              );
              connectionsByNode[idx].push({
                targetId: centerIdx,
                strength: 0.7,
                distance: dist,
              });
            }
          }
        });

        // Connect center node to all target nodes (except main center)
        nodeList.forEach((node, idx) => {
          if (node.type === "target" && idx !== centerIdx) {
            const exists = connectionsByNode[centerIdx].some(
              (c) => c.targetId === idx
            );
            if (!exists) {
              const dist = Math.hypot(
                nodeList[centerIdx].x - node.x,
                nodeList[centerIdx].y - node.y
              );
              connectionsByNode[centerIdx].push({
                targetId: idx,
                strength: 0.7,
                distance: dist,
              });
            }
          }
        });
      } else {
        // If no center node, create a simple chain connection
        for (let i = 0; i < nodeList.length - 1; i++) {
          const exists = connectionsByNode[i].some((c) => c.targetId === i + 1);
          if (!exists) {
            const dist = Math.hypot(
              nodeList[i].x - nodeList[i + 1].x,
              nodeList[i].y - nodeList[i + 1].y
            );
            connectionsByNode[i].push({
              targetId: i + 1,
              strength: 0.6,
              distance: dist,
            });
          }
        }
      }
    }

    // Ensure center node connects to its explicit prerequisites
    const centerNode = nodeList.find((n) => n.isCenter);
    if (centerNode) {
      const centerConcept = concepts.find((c) => c.name === centerNode.name);
      if (centerConcept) {
        const centerPrereqs = extractPrereqNames(centerConcept);
        for (const pName of centerPrereqs) {
          const pIdx = nodeIndexByName.get(pName);
          if (pIdx !== undefined && pIdx !== nodeList.indexOf(centerNode)) {
            const dist = Math.hypot(
              centerNode.x - nodeList[pIdx].x,
              centerNode.y - nodeList[pIdx].y
            );
            // prerequisite -> center
            connectionsByNode[pIdx].push({
              targetId: nodeList.indexOf(centerNode),
              strength: 0.9,
              distance: dist,
            });
          }
        }
      }
    }

    return nodeList.map((n, idx) => ({
      ...n,
      connections: connectionsByNode[idx],
    }));
  };

  const processLearningPathToFlow = (
    data: LearningPath | undefined
  ): { nodes: Node[]; edges: Edge[] } => {
    if (!data || !data.concepts) return { nodes: [], edges: [] };

    const processedNodes = processLearningPath(data);
    const nodesWithConnections = calculateConnections(processedNodes, data);

    const flowNodes: Node[] = nodesWithConnections.map((node) => ({
      id: node.id.toString(),
      type: "custom",
      position: { x: node.x, y: node.y },
      data: {
        node,
        onNodeClick: handleConceptClick,
        completedConcepts,
        toggleComplete,
        onExpandPrerequisites: expandPrerequisites,
        isExpanding: expandingConcept === node.name,
      },
      draggable: true,
    }));

    const flowEdges: Edge[] = [];
    nodesWithConnections.forEach((node) => {
      node.connections.forEach((conn) => {
        flowEdges.push({
          id: `${node.id}-${conn.targetId}`,
          source: node.id.toString(),
          target: conn.targetId.toString(),
          type: "smoothstep",
          animated:
            completedConcepts.has(node.id) ||
            completedConcepts.has(conn.targetId),
          style: {
            stroke:
              completedConcepts.has(node.id) ||
              completedConcepts.has(conn.targetId)
                ? "#3b82f6"
                : "#cbd5e1",
            strokeWidth:
              node.isCenter || nodesWithConnections[conn.targetId]?.isCenter
                ? 3
                : 2,
          },
        });
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

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
  const fetchConceptResources = async (
    conceptId: string,
    conceptName: string
  ) => {
    setLoadingResources((prev) => ({ ...prev, [conceptId]: true }));
    try {
      const response = await mathAPI.getResourcesForConcept(conceptName, {
        limit: 5,
        minQuality: 60,
      });

      let apiData: unknown = response;
      if (response && typeof response === "object" && "data" in response) {
        apiData = response.data;
      }

      let resources: EducationalResource[] = [];
      if (Array.isArray(apiData)) {
        resources = apiData as EducationalResource[];
      } else if (apiData && typeof apiData === "object") {
        const anyObj = apiData as Record<string, unknown>;
        // Try common shapes: { resources: [...] } or { data: { resources: [...] } }
        const direct = anyObj["resources"];
        const nested = (
          anyObj["data"] as Record<string, unknown> | undefined
        )?.["resources"];
        const r = Array.isArray(direct)
          ? direct
          : Array.isArray(nested)
          ? nested
          : undefined;
        resources = (r as EducationalResource[]) || [];
      }

      setConceptResources((prev) => ({ ...prev, [conceptId]: resources }));
    } catch (error) {
      console.error(
        `Failed to fetch resources for concept ${conceptName}:`,
        error
      );
      setConceptResources((prev) => ({ ...prev, [conceptId]: [] }));
    } finally {
      setLoadingResources((prev) => ({ ...prev, [conceptId]: false }));
    }
  };

  const handleConceptClick = async (node: NodeData) => {
    // Highlight only the edges connected to this node
    highlightEdgesForNode(node.id);

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
        prerequisites = conceptDetail.learning_path.concepts.filter(
          (c: Concept) => c.name !== node.name
        );
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

      console.log("🔍 Neural concept detail loaded:", conceptDetail);
    } catch (error) {
      console.error("Failed to load concept details:", error);
      setConceptDetails({
        error:
          error instanceof Error
            ? error.message
            : "Failed to load detailed information for this concept.",
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

  // Function to expand prerequisites for a concept
  const expandPrerequisites = async (conceptNode: NodeData) => {
    if (conceptNode.isExpanded) {
      return;
    }

    setExpandingConcept(conceptNode.name);
    
    try {
      const response = await mathAPI.smartConceptQuery(conceptNode.name, {
        includeLearningPath: true,
        includeResources: false,
      });

      if (!response.learning_path?.concepts) {
        console.warn("No prerequisites found for:", conceptNode.name);
        setExpandingConcept(null);
        // Still mark as expanded to prevent repeated attempts
        setAllNodesData(prev => prev.map(n => 
          n.id === conceptNode.id ? { ...n, isExpanded: true } : n
        ));
        return;
      }

      const prerequisites = response.learning_path.concepts.filter(
        (c: Concept) => c.type === "prerequisite" && c.name !== conceptNode.name
      );

      if (prerequisites.length === 0) {
        console.log("No prerequisites to add");
        setExpandingConcept(null);
        setAllNodesData(prev => prev.map(n => 
          n.id === conceptNode.id ? { ...n, isExpanded: true } : n
        ));
        return;
      }

      const existingConceptNames = new Set(allNodesData.map(n => n.name));
      const newPrerequisites = prerequisites.filter(
        (c: Concept) => !existingConceptNames.has(c.name)
      );

      if (newPrerequisites.length === 0) {
        console.log("All prerequisites already in graph");
        setExpandingConcept(null);
        setAllNodesData(prev => prev.map(n => 
          n.id === conceptNode.id ? { ...n, isExpanded: true } : n
        ));
        return;
      }

      // Calculate optimal positions in a spiral pattern around the clicked node
      const radius = 220;
      const angleOffset = Math.random() * Math.PI * 2;
      
      const newNodes: NodeData[] = newPrerequisites.map((prereq: Concept, index: number) => {
        // Use golden angle for better distribution
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const angle = angleOffset + index * goldenAngle;
        const currentRadius = radius + (index * 30); // Spiral outward
        
        const x = conceptNode.x + Math.cos(angle) * currentRadius;
        const y = conceptNode.y + Math.sin(angle) * currentRadius;

        return {
          id: nextNodeId + index,
          name: prereq.name,
          description: prereq.description || "",
          difficulty: prereq.difficulty_level || "intermediate",
          x: Math.max(80, Math.min(1400, x)),
          y: Math.max(80, Math.min(900, y)),
          connections: [],
          size: 50,
          pulseDelay: index * 0.3,
          isCenter: false,
          type: "prerequisite" as const,
          isExpanded: false,
        };
      });

      setNextNodeId(prev => prev + newPrerequisites.length);

      // Mark the clicked concept as expanded
      const updatedExistingNodes = allNodesData.map(n => 
        n.id === conceptNode.id ? { ...n, isExpanded: true } : n
      );

      // Add connections from new prerequisites to the clicked concept
      const allUpdatedNodes = [...updatedExistingNodes, ...newNodes].map(node => {
        if (newNodes.some(n => n.id === node.id)) {
          const distance = Math.hypot(node.x - conceptNode.x, node.y - conceptNode.y);
          return {
            ...node,
            connections: [
              ...node.connections,
              { targetId: conceptNode.id, strength: 0.9, distance }
            ]
          };
        }
        return node;
      });

      // Update state to trigger re-render with new nodes
      setAllNodesData(allUpdatedNodes);

    } catch (error) {
      console.error("Failed to expand prerequisites:", error);
      // Mark as expanded even on error to prevent infinite retries
      setAllNodesData(prev => prev.map(n => 
        n.id === conceptNode.id ? { ...n, isExpanded: true } : n
      ));
    } finally {
      setExpandingConcept(null);
    }
  };

  const updateFlowNodesAndEdges = (nodesList: NodeData[]) => {
    const flowNodes: Node[] = nodesList.map((node) => ({
      id: node.id.toString(),
      type: "custom",
      position: { x: node.x, y: node.y },
      data: {
        node,
        onNodeClick: handleConceptClick,
        completedConcepts,
        toggleComplete,
        onExpandPrerequisites: expandPrerequisites,
        isExpanding: expandingConcept === node.name,
      },
      draggable: true,
    }));

    const flowEdges: Edge[] = [];
    nodesList.forEach((node) => {
      node.connections.forEach((conn) => {
        const edgeId = `${node.id}-${conn.targetId}`;
        const isNewEdge = !edges.find(e => e.id === edgeId);
        
        flowEdges.push({
          id: edgeId,
          source: node.id.toString(),
          target: conn.targetId.toString(),
          type: "smoothstep",
          animated: isNewEdge || 
            completedConcepts.has(node.id) ||
            completedConcepts.has(conn.targetId),
          style: {
            stroke:
              completedConcepts.has(node.id) ||
              completedConcepts.has(conn.targetId)
                ? "#3b82f6"
                : isNewEdge
                ? "#10b981"
                : "#cbd5e1",
            strokeWidth:
              node.isCenter || nodesList[conn.targetId]?.isCenter ? 3 : 2,
            opacity: isNewEdge ? 0.8 : 1,
          },
        });
      });
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  };

  // Initialize graph when learningPath is first received
  useEffect(() => {
    if (!learningPath) return;

    const processedNodes = processLearningPath(learningPath);
    const nodesWithConnections = calculateConnections(processedNodes, learningPath);
    
    setAllNodesData(nodesWithConnections);
    setNextNodeId(nodesWithConnections.length);
  }, [learningPath]);

  // Update React Flow nodes and edges whenever allNodesData or completedConcepts change
  useEffect(() => {
    if (allNodesData.length > 0) {
      updateFlowNodesAndEdges(allNodesData);
    }
  }, [allNodesData, completedConcepts]);

  if (nodes.length === 0) {
    return (
      <NeuralContainer>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          height="100%"
        >
          <RiSparklingLine
            size={48}
            color="text.secondary"
            style={{ marginBottom: 16 }}
          />
          <Typography variant="h6">No Knowledge Map available</Typography>
          <Typography variant="body2" color="text.secondary">
            Create connections by exploring concepts
          </Typography>
        </Box>
      </NeuralContainer>
    );
  }

  return (
    <NeuralContainer>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        p={2}
        borderBottom={1}
        borderColor="divider"
      >
        <Typography
          variant="h6"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          🧠 Knowledge Map
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="body2" color="text.secondary">
            {completedConcepts.size}/{nodes.length} mastered
          </Typography>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              bgcolor: "primary.main",
              animation: "pulse 2s infinite",
            }}
          />
        </Box>
      </Box>

      <Box sx={{ flex: 1, position: "relative" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onPaneClick={() => {
            resetEdgeStyles();
          }}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          {/* <Panel position="top-left">
            <Box
              sx={{
                bgcolor: "rgba(255,255,255,0.9)",
                p: 2,
                borderRadius: 2,
                boxShadow: 2,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, fontWeight: "bold" }}
              >
                Legend
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: "#10b981",
                      border: "2px solid #10b981",
                    }}
                  />
                  <Typography variant="caption">Beginner</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: "#3b82f6",
                      border: "2px solid #3b82f6",
                    }}
                  />
                  <Typography variant="caption">Intermediate</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: "#f59e0b",
                      border: "2px solid #f59e0b",
                    }}
                  />
                  <Typography variant="caption">Advanced</Typography>
                </Box>
              </Box>
            </Box>
          </Panel> */}
        </ReactFlow>
      </Box>

      {sidePanelOpen && selectedConcept && (
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
              <Typography variant="h6">{selectedConcept.name}</Typography>
            </Box>
            <IconButton onClick={closeSidePanel}>
              <RiCloseLine />
            </IconButton>
          </Box>

          <Box p={2} sx={{ overflow: "auto", flex: 1 }}>
            {loadingConcept ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                height={200}
              >
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Loading {selectedConcept.name} details...
                </Typography>
              </Box>
            ) : conceptDetails ? (
              <>
                {/* Concept Header */}
                <Box
                  sx={{
                    mb: 3,
                    p: 2,
                    bgcolor: "background.paper",
                    borderRadius: 1,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ mb: 1, color: "primary.main" }}
                  >
                    {selectedConcept?.name}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedConcept?.description}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                      label={selectedConcept?.difficulty}
                      sx={{
                        bgcolor: getDifficultyColor(
                          selectedConcept?.difficulty || "intermediate"
                        ),
                        color: "white",
                      }}
                    />
                    <Chip
                      label={selectedConcept?.type}
                      variant="outlined"
                      color={
                        selectedConcept?.type === "prerequisite"
                          ? "warning"
                          : "success"
                      }
                    />
                    <Button
                      variant={
                        completedConcepts.has(selectedConcept?.id || 0)
                          ? "contained"
                          : "outlined"
                      }
                      startIcon={<RiCheckboxCircleLine />}
                      onClick={() => toggleComplete(selectedConcept?.id || 0)}
                      size="small"
                    >
                      {completedConcepts.has(selectedConcept?.id || 0)
                        ? "Mastered"
                        : "Mark as Mastered"}
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
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: "medium", mb: 1 }}
                    >
                      Why this concept matters:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      This concept is fundamental to understanding advanced
                      mathematical topics and enables complex problem-solving.
                    </Typography>
                  </Box>
                </Box>

                {/* Prerequisites Section */}
                {conceptDetails.prerequisites &&
                  conceptDetails.prerequisites.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          mb: 2,
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        📚 Prerequisites
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        {conceptDetails.prerequisites.map(
                          (prereq: Concept, prereqIndex: number) => (
                            <Box
                              key={prereq.id}
                              sx={{
                                pl: 2,
                                borderLeft: 3,
                                borderColor: "warning.main",
                                py: 1,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: "medium" }}
                              >
                                {prereqIndex + 1}. {prereq.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {prereq.description}
                              </Typography>
                            </Box>
                          )
                        )}
                      </Box>
                    </Box>
                  )}

                 {/* Neural Pathway Analysis */}
                                {conceptDetails.explanation && (
                                  <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                                      Concept Details
                                    </Typography>
                                    <Paper
                                      sx={{
                                        p: 2,
                                        bgcolor: "background.paper",
                                        border: 1,
                                        borderColor: "divider",
                                        "& code": {
                                          bgcolor: "rgba(148, 163, 184, 0.16)",
                                          px: 0.5,
                                          py: 0.25,
                                          borderRadius: 0.75,
                                          fontFamily:
                                            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                          fontSize: "0.92em",
                                        },
                                        "& pre": {
                                          bgcolor: "rgba(148, 163, 184, 0.16)",
                                          p: 1,
                                          borderRadius: 1,
                                          overflow: "auto",
                                        },
                                        "& h1, & h2, & h3, & h4, & h5, & h6": {
                                          color: "primary.main",
                                          mt: 2,
                                          mb: 1,
                                        },
                                        "& ul, & ol": {
                                          pl: 2,
                                        },
                                        "& li": {
                                          mb: 0.5,
                                        },
                                        "& blockquote": {
                                          borderLeft: 4,
                                          borderColor: "primary.main",
                                          pl: 2,
                                          fontStyle: "italic",
                                          color: "text.secondary",
                                        },
                                      }}
                                    >
                                      <ReactMarkdown>{conceptDetails.explanation}</ReactMarkdown>
                                    </Paper>
                                  </Box>
                                )}

                

                {/* Concept-specific resources */}
                {conceptResources[selectedConcept?.id.toString() || ""] &&
                  conceptResources[selectedConcept?.id.toString() || ""]
                    .length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          mb: 2,
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        🎥 Learning Resources for {selectedConcept?.name}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        {conceptResources[
                          selectedConcept?.id.toString() || ""
                        ].map((resource) => (
                          <ResourceCard key={resource.id} resource={resource} />
                        ))}
                      </Box>
                    </Box>
                  )}

                {/* Loading state for concept resources */}
                {loadingResources[selectedConcept?.id.toString() || ""] && (
                  <Box sx={{ textAlign: "center", py: 2 }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Fetching resources for {selectedConcept?.name}...
                    </Typography>
                  </Box>
                )}

                {conceptDetails?.error && (
                  <Typography variant="body2" color="error.main">
                    {conceptDetails.error}
                  </Typography>
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
function ResourceCard({ resource }: { resource: EducationalResource }) {
  const [showVideo, setShowVideo] = useState(false);
  const videoId = resource.url ? getYouTubeVideoId(resource.url) : null;

  return (
    <Paper sx={{ p: 2, "&:hover": { boxShadow: 2 } }}>
      <Box sx={{ display: "flex", gap: 2 }}>
        {/* Thumbnail/Play Button */}
        <Box sx={{ position: "relative", minWidth: 120, height: 90 }}>
          {videoId && !showVideo ? (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                bgcolor: "grey.300",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                borderRadius: 1,
              }}
              onClick={() => setShowVideo(true)}
            >
              <RiPlayFill size={32} color="#1976d2" />
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
                width: "100%",
                height: "100%",
                bgcolor: "grey.300",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 1,
              }}
            >
              {resource.resource_type === "video" ? (
                <RiPlayFill />
              ) : (
                <RiSearchLine />
              )}
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

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
            <Chip
              label={resource.platform || "youtube"}
              size="small"
              sx={{
                bgcolor: getPlatformColor(resource.platform || "youtube"),
                color: "white",
              }}
            />
            <Chip
              label={resource.resource_type}
              size="small"
              variant="outlined"
            />
            <Chip
              label={resource.difficulty_level}
              size="small"
              color={
                resource.difficulty_level === "beginner"
                  ? "success"
                  : resource.difficulty_level === "intermediate"
                  ? "warning"
                  : "error"
              }
              variant="outlined"
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {resource.estimated_duration && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <RiTimeLine size={16} />
                <Typography variant="caption">
                  {resource.estimated_duration}
                </Typography>
              </Box>
            )}

            {resource.view_count && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <RiStarLine size={16} style={{ color: "#ed6c02" }} />
                <Typography variant="caption">
                  {resource.view_count.toLocaleString()} views
                </Typography>
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
    case "youtube.com":
      return "#ff0000";
    case "khan_academy":
      return "#14b866";
    case "coursera":
      return "#0056d2";
    default:
      return "#64748b";
  }
}


// Helper function for YouTube video ID extraction
function getYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/s]{11})/
  );
  return match ? match[1] : null;
}
