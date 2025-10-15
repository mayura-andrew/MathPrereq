# 🧮 MathPrereq
*LLM and Knowledge Graph Based Framework for Dynamic Prerequisite Knowledge Identification in Foundational Mathematics*

An AI-powered mathematics tutoring system that provides personalized learning paths using knowledge graphs, semantic search, and large language models.

## 🌟 Features

- **🎯 Intelligent Concept Identification**: Automatically identifies mathematical concepts from student queries
- **📊 Knowledge Graph Navigation**: Maps prerequisite relationships between mathematical concepts
- **🔍 Semantic Search**: Finds relevant content from textbooks using vector embeddings
- **🤖 AI-Powered Explanations**: Generates personalized explanations using OpenAI/Groq models
- **🗺️ Visual Learning Paths**: Interactive concept roadmaps showing prerequisite dependencies
- **⚡ Real-time Processing**: Fast, async API with intelligent fallback mechanisms

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │   Data Layer    │
│                 │    │                  │    │                 │
│ React + Vite    │◄──►│ FastAPI + Python │◄──►│ ChromaDB        │
│ ReactFlow       │    │ Async Processing │    │ NetworkX        │
│ Tailwind CSS    │    │ LLM Integration  │    │ Vector Store    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Core Components

- **🧠 LLM Client**: Multi-provider support (OpenAI, Groq) with intelligent fallback
- **📈 Knowledge Graph**: NetworkX-based curriculum structure with prerequisite mapping
- **🔍 Vector Store**: ChromaDB for semantic search over textbook content
- **🎭 Orchestration Engine**: Coordinates concept identification, graph traversal, and response generation

## 🚀 Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- OpenAI API key (optional) or Groq API key (free)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd research
```

2. **Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env and add your API keys:
# OPENAI_API_KEY=your_openai_key_here
# GROQ_API_KEY=your_groq_key_here
```

4. **Frontend Setup**
```bash
cd ../frontend
npm install
```

5. **Run the Application**
```bash
# Option 1: Use the convenience script
chmod +x scripts/run-dev.sh
./scripts/run-dev.sh

# Option 2: Manual startup
# Terminal 1 - Backend
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

6. **Access the Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 📚 Usage Examples

### API Endpoints

#### Query Processing
```bash
curl -X POST "http://localhost:8000/api/v1/query" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is a derivative?"}'
```

#### Concept Details
```bash
curl -X POST "http://localhost:8000/api/v1/concept-detail" \
  -H "Content-Type: application/json" \
  -d '{"concept_id": "derivatives"}'
```

#### List All Concepts
```bash
curl -X GET "http://localhost:8000/api/v1/concepts"
```

### Sample Questions to Try

- "What is a derivative and how do I find it?"
- "Explain integration by parts with an example"
- "What do I need to know before learning calculus?"
- "How does the chain rule work?"
- "What's the relationship between limits and derivatives?"

## 🛠️ Technology Stack

### Backend
- **FastAPI**: Modern, fast web framework for APIs
- **Pydantic**: Data validation and settings management
- **NetworkX**: Graph algorithms for knowledge representation
- **ChromaDB**: Vector database for semantic search
- **OpenAI/Groq**: Large language model providers
- **Tenacity**: Retry logic and error handling

### Frontend
- **React 18**: Modern UI framework
- **Vite**: Fast build tool and dev server
- **ReactFlow**: Interactive graph visualization
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: HTTP client for API communication

### Data Processing
- **Sentence Transformers**: Text embeddings
- **Pandas**: Data manipulation
- **Structlog**: Structured logging

## 📁 Project Structure

```
research/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routes and models
│   │   ├── core/         # Core business logic
│   │   ├── data/         # Data processing and storage
│   │   └── utils/        # Utility functions
│   ├── data/
│   │   └── raw/          # Source data (CSV, textbooks)
│   ├── scripts/          # Development and deployment scripts
│   └── tests/            # Test suite
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API clients
│   │   └── utils/        # Frontend utilities
│   └── public/           # Static assets
└── docs/                 # Documentation
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OPENAI_API_KEY` | OpenAI API key | - | No* |
| `GROQ_API_KEY` | Groq API key (free alternative) | - | No* |
| `DEFAULT_LLM_MODEL` | Default model to use | `gpt-4o-mini` | No |
| `MAX_TOKENS` | Maximum response tokens | `2000` | No |
| `TEMPERATURE` | LLM temperature setting | `0.1` | No |
| `CHROMA_PERSIST_DIRECTORY` | Vector DB storage path | `./data/chroma_db` | No |

*At least one API key (OpenAI or Groq) is required for LLM functionality.

### Data Sources

- **Knowledge Graph**: `backend/data/raw/nodes.csv` and `edges.csv`
- **Textbook Content**: `backend/data/raw/calculus_textbook.txt`
- **Vector Store**: Auto-generated ChromaDB embeddings

## 🚀 Deployment

### Production Deployment on Alibaba Cloud

For detailed deployment instructions, see [DEPLOYMENT.md](docs/DEPLOYMENT.md).

**Quick Deploy:**

```bash
# SSH into your Alibaba Cloud ECS instance
ssh ubuntu@your-ecs-ip

# Clone and deploy
git clone <repository-url> /opt/mathprereq
cd /opt/mathprereq
cp .env.production.example .env
# Edit .env with your credentials
nano .env

# Run deployment
chmod +x scripts/deploy.sh
./scripts/deploy.sh production
```

**Services:**
- Frontend: `http://your-domain.com`
- Backend API: `http://your-domain.com/api`
- Neo4j Browser: `http://your-ip:7474`

**Monitoring:**
```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check service health
docker-compose -f docker-compose.prod.yml ps

# Monitor resources
docker stats
```

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# Integration tests
chmod +x scripts/test.sh
./scripts/test.sh
```

## 📈 Current Dataset

The system includes sample mathematics curriculum data:

- **9 Core Concepts**: Functions, Limits, Derivatives, Integration, etc.
- **Prerequisite Relationships**: Directed graph of learning dependencies
- **Textbook Content**: Calculus explanations and examples
- **Vector Embeddings**: Semantic search over 50+ text chunks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🛡️ Security

- API keys are stored in environment variables
- Sensitive files are excluded via `.gitignore`
- No user data is logged or stored permanently
- Rate limiting and retry logic prevent API abuse
- Production deployment uses Docker security best practices
- Nginx reverse proxy with SSL/TLS encryption
- Security group configuration for Alibaba Cloud

## 🔮 Future Enhancements

- [ ] Multi-subject support (Physics, Chemistry, etc.)
- [ ] User progress tracking and adaptive learning
- [ ] Advanced visualization with 3D concept graphs
- [ ] Integration with learning management systems
- [ ] Mobile app development
- [ ] Collaborative learning features

## 📞 Support

For questions, issues, or contributions:

- Create an [Issue](../../issues)
- Check the [Documentation](docs/)
- Review the [API Documentation](http://localhost:8000/docs) when running

---

**Built with ❤️ for mathematics education using AI and modern web technologies**