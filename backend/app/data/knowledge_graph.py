import networkx as nx
import pandas as pd
from typing import List, Dict, Tuple, Optional, Set
import structlog
import os

logger = structlog.get_logger()

class KnowledgeGraph:
    def __init__(self, node_file: str, edges_file: str):
        self.graph = nx.DiGraph()
        self.concept_mapping = {}
        self.load_from_csv(node_file, edges_file)

    def load_from_csv(self, nodes_file: str, edges_file: str):
        """Load knowledge graph from CSV files"""
        try:
            if not os.path.exists(nodes_file):
                raise FileNotFoundError(f"Nodes file not found: {nodes_file}")
            if not os.path.exists(edges_file):
                raise FileNotFoundError(f"Edges file not found: {edges_file}")
            
            #Load nodes
            nodes_df = pd.read_csv(nodes_file)
            for _, row in nodes_df.iterrows():
                node_id = row['node_id']
                concept_name = row['concept_name']
                description = row['description']

                self.graph.add_node(
                    node_id,
                    concept_name=concept_name,
                    description=description
                )

                # create mapping for easier lookup

                self.concept_mapping[concept_name.lower()] = node_id
                self.concept_mapping[node_id.lower()] = node_id

            #Load edges

            edges_df = pd.read_csv(edges_file)
            for _, row in edges_df.iterrows():
                self.graph.add_edge(
                    row['source_id'],
                    row['target_id'],
                    relationship_type=row['relationship_type']
                )
            logger.info(f"📊 Loaded KG with {len(self.graph.nodes)} nodes and {len(self.graph.edges)} edges")

        except Exception as e:
            logger.error(f"❌ Error loading knowledge graph: {e}")
            raise

    def find_concept_id(self, concept_name: str) -> Optional[str]:
            
            """Find node ID for a concept name (fuzzy matching)"""
            concept_lower = concept_name.lower()

            #direct match

            if concept_lower in self.concept_mapping:
                return self.concept_mapping[concept_lower]
            
            # partial matching
            for mapped_concept, node_id in self.concept_mapping.items():
                if concept_lower in mapped_concept or mapped_concept in concept_lower:
                    return node_id
                
            return None
    
    def find_prerequisite_path(self, target_concepts: List[str]) -> List[Dict]:
        """Find prerequisite path for given concepts"""
        try:
            all_prerequisites = set()
            target_nodes = []

            #find node IDs for target concepts
            for concept in target_concepts:
                node_id = self.find_concept_id(concept)
                if node_id:
                    target_nodes.append(node_id)
                    logger.info(f"🎯 Found concept: {concept} -> {node_id}")

                else:
                    logger.warning(f"⚠️ Concept not found in KG: {concept}")
            if not target_nodes:
                logger.warning("❌ No target concepts found in knowledge graph")
                return []
            
            for target_node in target_nodes:

                # Find all nodes that are prerequisites (ancestors) of the target
                predecessors = list(nx.ancestors(self.graph, target_node))
                all_prerequisites.update(predecessors)
                all_prerequisites.add(target_node)
                
            if not all_prerequisites:
                return []
        
            subgraph = self.graph.subgraph(all_prerequisites)

            try:
                learning_path = list(nx.topological_sort(subgraph))
            except nx.NetworkXError:
                learning_path = list(all_prerequisites)

            path_data = []
            for concept_id in learning_path:
                if concept_id in self.graph.nodes:
                    node_data = self.graph.nodes[concept_id]
                    path_data.append({
                        'id': concept_id,
                        'name': node_data.get('concept_name', concept_id),
                        'description': node_data.get('description', ''),
                        'type': 'prerequisite' if concept_id not in target_nodes else 'target'
                    })

            logger.info(f"📍 Found learning path with {len(path_data)} concepts")
            return path_data
        
        except Exception as e:
            logger.error(f"❌ Error finding prerequisite path: {e}")
            return []
        
    def get_concept_info(self, concept_id: str) -> Optional[Dict]:
            """Get detailed information about a concept"""
            if concept_id in self.graph.nodes:
                node_data = self.graph.nodes[concept_id]
                return {
                    'id': concept_id,
                    'name': node_data.get('concept_name', concept_id),
                    'description': node_data.get('description', ''),
                    'prerequisites': list(self.graph.predecessors(concept_id)),
                    'leads_to': list(self.graph.successors(concept_id))
                }
            return None

    def get_all_concepts(self) -> List[Dict]:
        """Get all concepts in the knowledge graph"""
        concepts = []
        for node_id in self.graph.nodes:
            node_data = self.graph.nodes[node_id]
            concepts.append({
                'id': node_id,
                'name': node_data.get('concept_name', node_id),
                'description': node_data.get('description', '')
            })
        return concepts

