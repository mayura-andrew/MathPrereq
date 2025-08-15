#!/bin/bash

set -e

echo "🚀 Starting Mathematics Learning Framework Development Environment"
echo "=================================================================="

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    fi
    return 0
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check for .env file
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example"
    cp .env.example .env
    echo "📝 Please update .env with your API keys before continuing."
    echo ""
    echo "Required API keys:"
    echo "  - OPENAI_API_KEY: Get from https://platform.openai.com/api-keys"
    echo "  - GROQ_API_KEY: Get from https://console.groq.com/keys (optional)"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

# Check required environment variables
source .env
if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_openai_key_here" ]; then
    echo "❌ Please set OPENAI_API_KEY in your .env file"
    exit 1
fi

# Check ports
echo "🔍 Checking ports..."
if ! check_port 8000; then
    echo "❌ Backend port 8000 is already in use. Please stop the existing service."
    exit 1
fi

if ! check_port 5173; then
    echo "❌ Frontend port 5173 is already in use. Please stop the existing service."
    exit 1
fi

# Start backend
echo "🐍 Starting backend server..."
cd backend
source ../venv/bin/activate

# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "📦 Installing backend dependencies..."
    pip install -r requirements.txt
fi

# Start backend in background
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if ! curl -s http://localhost:8000/health >/dev/null; then
    echo "❌ Backend failed to start"
    cleanup
    exit 1
fi

echo "✅ Backend is running on http://localhost:8000"

# Start frontend
echo "⚛️  Starting frontend server..."
cd ../frontend

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start frontend in background
npm run dev &
FRONTEND_PID=$!

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 3

echo ""
echo "🎉 Development environment is ready!"
echo "=================================="
echo ""
echo "📖 Backend API: http://localhost:8000"
echo "📋 API Documentation: http://localhost:8000/docs"
echo "🌐 Frontend Application: http://localhost:5173"
echo "🏥 Health Check: http://localhost:8000/health"
echo ""
echo "💡 Tips:"
echo "  - Open http://localhost:5173 to use the application"
echo "  - Check http://localhost:8000/docs for API documentation"
echo "  - Backend logs will appear above"
echo "  - Press Ctrl+C to stop all services"
echo ""

# Wait for user interrupt
wait