from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.routes import router
from api.concept_routes import router as concept_router
from core.config import settings
from data.knowledge_graph import KnowledgeGraph
from data.vector_store import VectorStore

from .api.submission_routes import router as submission_router

from api.resource_routes import router as resource_router


# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# global instances
knowledge_graph = None
vector_store = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialie and cleanup application resources"""
    global knowledge_graph, vector_store

    try:
        logger.info("🚀 Initializing application...")

        # initialize kg

        nodes_path = os.path.join("data", "raw", "nodes.csv")
        edges_path = os.path.join("data", "raw", "edges.csv")
        knowledge_graph = KnowledgeGraph(nodes_path, edges_path)

        # Initialize Vector Store
        textbook_path = os.path.join("data", "raw", "calculus_textbook.txt")
        vector_store = VectorStore(
            persist_directory=settings.chroma_persist_directory,
            textbook_path=textbook_path
        )
        await vector_store.initialize()

        # make instanes available globally
        app.state.knowledge_graph = knowledge_graph
        app.state.vector_store = vector_store

        logger.info("✅ Application initialized successfully")
        yield

    except Exception as e:
        logger.error(f"❌ Failed to initialize application: {e}")
        raise
    finally:
        logger.info("🛑 Application shutdown")

app = FastAPI(
    title="Mathematics Learning Framework API",
    description="LLM-KG based system for prerequisite knowledge identification",
    version="0.1.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api/v1")
app.include_router(concept_router, prefix="/api/v1")
app.include_router(submission_router, prefix="/api/v1")
app.include_router(resource_router, prefix="/api/v1", tags=["educational-resources"])

@app.get("/")
async def root():
    return {
        "message": "Mathematics Learning Framework API",
        "version": "0.1.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "math-learning-framework",
        "kg_loaded": knowledge_graph is not None,
        "vector_store_loaded": vector_store is not None
    }