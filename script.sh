# setup.sh - Main project setup script
#!/bin/bash

set -e  # Exit on any error

echo "🔧 Setting up LLM-KG Mathematics Learning Framework"
echo "=================================================="

# Check if Python 3.9+ is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3.9+ is required but not installed"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

# Create project structure
echo "📁 Creating project structure..."
mkdir -p backend/{app/{api,core,data,utils},data/{raw,processed},tests}
mkdir -p frontend/src/{components,services,utils}
mkdir -p docs scripts

# Create Python virtual environment
echo "🐍 Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Backend setup
echo "⚙️  Setting up backend..."
cd backend

# Create requirements.txt
cat > requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-dotenv==1.0.0
pandas==2.1.3
networkx==3.2.1
chromadb==0.4.18
openai==1.3.5
groq==0.4.1
langchain==0.0.340
langchain-community==0.0.38
sentence-transformers==2.2.2
numpy==1.24.3
scikit-learn==1.3.2
python-multipart==0.0.6
httpx==0.25.2
pytest==7.4.3
pytest-asyncio==0.21.1
structlog==23.2.0
tenacity==8.2.3
EOF

pip install -r requirements.txt

# Create sample data files
echo "📊 Creating sample data files..."
cat > data/raw/nodes.csv << 'EOF'
node_id,concept_name,description
func_basics,Basic Functions,Understanding of function notation domain and range
limits,Limits,The concept of approaching a value infinitely close
continuity,Continuity,Functions without breaks jumps or holes
derivatives,Derivatives,Rate of change and slope of tangent lines
chain_rule,Chain Rule,Derivative of composite functions
integration,Integration,Finding antiderivatives and area under curves
substitution,U-Substitution,Integration technique using substitution
parts,Integration by Parts,Integration technique for products of functions
EOF

cat > data/raw/edges.csv << 'EOF'
source_id,target_id,relationship_type
func_basics,limits,prerequisite_for
limits,continuity,prerequisite_for
limits,derivatives,prerequisite_for
derivatives,chain_rule,prerequisite_for
derivatives,integration,prerequisite_for
integration,substitution,prerequisite_for
integration,parts,prerequisite_for
EOF

cat > data/raw/calculus_textbook.txt << 'EOF'
Chapter: Methods of Integration

Basic Functions:
A function is a relation between a set of inputs and a set of possible outputs. Functions are typically denoted as f(x) where x is the input variable. The domain of a function is the set of all possible input values, while the range is the set of all possible output values.

Limits:
The limit of a function f(x) as x approaches a value c is the value that f(x) gets arbitrarily close to as x gets arbitrarily close to c. We write this as lim(x→c) f(x) = L. Limits are fundamental to calculus and form the basis for derivatives and integrals.

Derivatives:
The derivative of a function measures how the function changes as its input changes. Geometrically, the derivative at a point is the slope of the tangent line to the function at that point. The derivative of f(x) is denoted as f'(x) or df/dx.

Integration:
Integration is the reverse process of differentiation. The integral of a function f(x) gives us the area under the curve of f(x). There are two types: definite integrals (which give a numerical value) and indefinite integrals (which give a family of functions).

U-Substitution:
U-substitution is a technique for evaluating integrals by making a substitution that simplifies the integrand. We substitute u for a function of x, making the integral easier to evaluate.

Integration by Parts:
Integration by parts is used when the integrand is a product of two functions. The formula is ∫u dv = uv - ∫v du, where u and dv are chosen strategically to simplify the integral.
EOF

cd ..

# Frontend setup
echo "⚛️  Setting up frontend..."
cd frontend

# Create package.json
cat > package.json << 'EOF'
{
  "name": "math-learning-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@reactflow/core": "^11.7.4",
    "@reactflow/controls": "^11.1.13",
    "@reactflow/background": "^11.1.13",
    "@headlessui/react": "^1.7.17",
    "@heroicons/react": "^2.0.18",
    "axios": "^1.6.2",
    "zustand": "^4.4.6",
    "recharts": "^2.8.0",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@typescript-eslint/eslint-plugin": "^6.10.0",
    "@typescript-eslint/parser": "^6.10.0",
    "@vitejs/plugin-react": "^4.1.1",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.53.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.4",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.5",
    "typescript": "^5.2.2",
    "vite": "^5.0.0"
  }
}
EOF

npm install

# Create basic Tailwind config
npx tailwindcss init -p

# Update tailwind.config.js
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

cd ..

# Create environment file
echo "🔐 Creating environment configuration..."
cat > .env.example << 'EOF'
# LLM Configuration
OPENAI_API_KEY=your_openai_key_here
GROQ_API_KEY=your_groq_key_here

# Database Configuration
CHROMA_PERSIST_DIRECTORY=./backend/data/chroma_db

# API Configuration
BACKEND_HOST=localhost
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:5173

# Logging
LOG_LEVEL=INFO
EOF

# Create development scripts
echo "📜 Creating development scripts..."
cat > scripts/dev.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Development Environment"

# Check for .env file
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Please copy from .env.example and add your API keys"
    cp .env.example .env
    echo "📝 Created .env file. Please update it with your API keys before continuing."
    exit 1
fi

# Start backend in background
echo "🐍 Starting backend server..."
cd backend
source ../venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start frontend
echo "⚛️  Starting frontend server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "✅ Services started!"
echo "📖 Backend API: http://localhost:8000"
echo "🌐 Frontend: http://localhost:5173"
echo "📋 API Docs: http://localhost:8000/docs"

# Wait for Ctrl+C
trap "echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit 0" INT
wait
EOF

chmod +x scripts/dev.sh

cat > scripts/test.sh << 'EOF'
#!/bin/bash
echo "🧪 Running tests..."

cd backend
source ../venv/bin/activate
python -m pytest tests/ -v

echo "✅ Tests completed!"
EOF

chmod +x scripts/test.sh

# Create Docker files for later use
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./backend/data:/app/data
    env_file:
      - .env
    depends_on:
      - chroma

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    depends_on:
      - backend

  chroma:
    image: chromadb/chroma:latest
    ports:
      - "8001:8000"
    volumes:
      - chroma_data:/chroma/chroma

volumes:
  chroma_data:
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
share/python-wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# Virtual environments
venv/
env/
ENV/

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Build outputs
backend/data/processed/
backend/data/chroma_db/
frontend/dist/
frontend/build/

# Environment variables
.env
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# ChromaDB
*.sqlite3
*.db
EOF

echo ""
echo "🎉 Project setup completed!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and add your API keys"
echo "2. Run: chmod +x scripts/dev.sh"
echo "3. Run: ./scripts/dev.sh"
