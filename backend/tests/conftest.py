import pytest
import asyncio
from unittest.mock import Mock, AsyncMock
import sys
import os

# Add the app directory to Python path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def mock_llm_client():
    """Mock LLM client for testing"""
    mock = Mock()
    mock.identify_concepts = AsyncMock(return_value=['derivatives', 'functions'])
    mock.generate_explanation = AsyncMock(return_value="This is a test explanation.")
    return mock

@pytest.fixture
def mock_vector_store():
    """Mock vector store for testing"""
    mock = Mock()
    mock.semantic_search = AsyncMock(return_value=["Test context chunk 1", "Test context chunk 2"])
    mock.get_collection_stats = Mock(return_value={"total_chunks": 10})
    return mock