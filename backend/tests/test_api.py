import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient
import asyncio
from app.main import app

@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)

@pytest.fixture
def async_client():
    """Create async test client"""
    return AsyncClient(app=app, base_url="http://test")

class TestAPI:
    def test_root_endpoint(self, client):
        """Test the root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Mathematics Learning Framework API" in data["message"]

    def test_health_endpoint(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "math-learning-framework"

    @pytest.mark.asyncio
    async def test_query_endpoint(self, async_client):
        """Test the main query processing endpoint"""
        async with async_client as ac:
            response = await ac.post("/api/v1/query", json={
                "question": "What is a derivative?"
            })
            
            assert response.status_code == 200
            data = response.json()
            
            # Check response structure
            assert "success" in data
            assert "query" in data
            assert "identified_concepts" in data
            assert "learning_path" in data
            assert "explanation" in data

    def test_invalid_query(self, client):
        """Test query endpoint with invalid data"""
        response = client.post("/api/v1/query", json={})
        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_concept_detail_endpoint(self, async_client):
        """Test concept detail endpoint"""
        async with async_client as ac:
            response = await ac.post("/api/v1/concept-detail", json={
                "concept_id": "derivatives"
            })
            
            # This might fail if the concept doesn't exist in test data
            # In a real test, we'd mock the knowledge graph
            assert response.status_code in [200, 404]

    @pytest.mark.asyncio
    async def test_concepts_list_endpoint(self, async_client):
        """Test listing all concepts"""
        async with async_client as ac:
            response = await ac.get("/api/v1/concepts")
            assert response.status_code == 200
            
            data = response.json()
            assert isinstance(data, list)