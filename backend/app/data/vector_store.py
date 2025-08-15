import chromadb
from chromadb.config import Settings as ChromaSettings
import os
from typing import List, Dict, Optional
import structlog
from sentence_transformers import SentenceTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter
import asyncio

logger = structlog.get_logger()

class VectorStore:
    def __init__(self, persist_directory: str, textbook_path: str):
        self.persit_directory = persist_directory
        self.textbook_path = textbook_path
        self.client = None
        self.collection = None
        self.embedding_model = None

    async def initialize(self):
        """Initialize ChromaDB and load textbook content"""
        try:
            os.makedirs(self.persit_directory, exist_ok=True)

            self.client = chromadb.PersistentClient(
                path=self.persit_directory,
                settings=ChromaSettings(anonymized_telemetry=False)
            )

            logger.info("🔧 Loading embedding model...")
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

            self.collection = self.client.get_or_create_collection(
                name="calculus_textbook",
                metadata={"description": "Calculus textbook content for RAG"}
            )

            if self.collection.count() == 0:
                await self._load_textbook_content()
            else:
                logger.info(f"📚 Vector store already contains {self.collection.count()} chunks")
            
            logger.info("✅ Vector store initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize vector store: {e}")
            raise

    async def _load_textbook_content(self):
        """Load and chunk textbook content into vector store"""
        try:
            if not os.path.exists(self.textbook_path):
                logger.warning(f"⚠️ Textbook file not found: {self.textbook_path}")
                return
            # read textbook content

            with open(self.textbook_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Split text into chunks
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=500,
                chunk_overlap=50,
                length_function=len,
                separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""]
            )

            chunks = text_splitter.split_text(content)
            logger.info(f"📄 Split textbook into {len(chunks)} chunks")

            # Generate embeddings and store in ChromaDB
            if chunks:
                # Generate embeddings
                embeddings = self.embedding_model.encode(chunks).tolist()
                
                # Prepare data for ChromaDB
                ids = [f"chunk_{i}" for i in range(len(chunks))]
                metadatas = [{"source": "calculus_textbook", "chunk_index": i} for i in range(len(chunks))]
                
                # Add to collection
                self.collection.add(
                    embeddings=embeddings,
                    documents=chunks,
                    metadatas=metadatas,
                    ids=ids
                )
                logger.info(f"✅ Added {len(chunks)} chunks to vector store")

        except Exception as e:
            logger.error(f"❌ Failed to load textbook content: {e}")
            raise

    async def semantic_search(self, query: str, n_results: int = 3) -> List[str]:
        """Perform semantic search for relevant context"""

        try:
            if not self.collection or not self.embedding_model:
                logger.error("❌ Vector store not initialized")
                return []
            
            query_embedding = self.embedding_model.encode([query]).tolist()[0]

            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                include=["documents", "metadatas", "distances"]
            )

            relevant_chunks = []
            if results['documents'] and results['documents'][0]:
                for i, (doc, metadata, distance) in enumerate(zip(
                    results['documents'][0],
                    results['metadatas'][0],
                    results['distances'][0]
                )):
                    relevant_chunks.append(doc)
                    logger.info(f"📖 Retrieved chunk {i+1} (similarity: {1-distance:.3f})")
            
            return relevant_chunks
        
        except Exception as e:
            logger.error(f"❌ Semantic search failed: {e}")
            return []
        
    def get_collection_stats(self) -> Dict:
        """Get statistics about the vector store"""
        if self.collection:
            return {
                "total_chunks": self.collection.count(),
                "collection_name": self.collection.name
            }
        return {"total_chunks": 0, "collection_name": "Not initialized"}