import pytest
import pandas as pd
import tempfile
import os
from app.data.knowledge_graph import KnowledgeGraph

@pytest.fixture
def sample_kg_data():
    """Create sample knowledge graph data for testing"""
    nodes_data = pd.DataFrame({
        'node_id': ['func_basics', 'limits', 'derivatives', 'integration'],
        'concept_name': ['Basic Functions', 'Limits', 'Derivatives', 'Integration'],
        'description': [
            'Understanding of function notation',
            'The concept of approaching a value', 
            'Rate of change and slope',
            'Finding antiderivatives'
        ]
    })
    
    edges_data = pd.DataFrame({
        'source_id': ['func_basics', 'limits', 'derivatives'],
        'target_id': ['limits', 'derivatives', 'integration'],
        'relationship_type': ['prerequisite_for', 'prerequisite_for', 'prerequisite_for']
    })
    
    return nodes_data, edges_data

@pytest.fixture
def temp_kg_files(sample_kg_data):
    """Create temporary CSV files for testing"""
    nodes_df, edges_df = sample_kg_data
    
    # Create temporary files
    nodes_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv')
    edges_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv')
    
    nodes_df.to_csv(nodes_file.name, index=False)
    edges_df.to_csv(edges_file.name, index=False)
    
    yield nodes_file.name, edges_file.name
    
    # Cleanup
    os.unlink(nodes_file.name)
    os.unlink(edges_file.name)

class TestKnowledgeGraph:
    def test_knowledge_graph_initialization(self, temp_kg_files):
        """Test that knowledge graph initializes correctly"""
        nodes_path, edges_path = temp_kg_files
        kg = KnowledgeGraph(nodes_path, edges_path)
        
        assert len(kg.graph.nodes) == 4
        assert len(kg.graph.edges) == 3
        assert kg.graph.has_node('func_basics')
        assert kg.graph.has_node('integration')

    def test_concept_mapping(self, temp_kg_files):
        """Test concept name to ID mapping"""
        nodes_path, edges_path = temp_kg_files
        kg = KnowledgeGraph(nodes_path, edges_path)
        
        assert kg.find_concept_id('Basic Functions') == 'func_basics'
        assert kg.find_concept_id('derivatives') == 'derivatives'
        assert kg.find_concept_id('nonexistent') is None

    def test_prerequisite_path_finding(self, temp_kg_files):
        """Test finding prerequisite paths"""
        nodes_path, edges_path = temp_kg_files
        kg = KnowledgeGraph(nodes_path, edges_path)
        
        # Test single concept
        path = kg.find_prerequisite_path(['Integration'])
        assert len(path) > 0
        
        # Check that integration appears in the path
        concept_names = [concept['name'] for concept in path]
        assert 'Integration' in concept_names

    def test_concept_info_retrieval(self, temp_kg_files):
        """Test getting detailed concept information"""
        nodes_path, edges_path = temp_kg_files
        kg = KnowledgeGraph(nodes_path, edges_path)
        
        info = kg.get_concept_info('derivatives')
        assert info is not None
        assert info['name'] == 'Derivatives'
        assert 'limits' in info['prerequisites']
        assert 'integration' in info['leads_to']

    def test_all_concepts_retrieval(self, temp_kg_files):
        """Test getting all concepts"""
        nodes_path, edges_path = temp_kg_files
        kg = KnowledgeGraph(nodes_path, edges_path)
        
        all_concepts = kg.get_all_concepts()
        assert len(all_concepts) == 4
        assert all(isinstance(concept, dict) for concept in all_concepts)
        assert all('name' in concept for concept in all_concepts)
