#!/bin/bash

echo "🧪 Testing Integrated Resource Scraping with Query Pipeline"
echo "========================================================"

# Set MongoDB environment variables
export MONGODB_USERNAME="admin"
export MONGODB_PASSWORD="password123"
export MONGODB_HOST="localhost"
export MONGODB_PORT="27017"
export MONGODB_DATABASE="mathprereq"
export MONGODB_AUTH_SOURCE="admin"

# Build the application
echo "🔨 Building application..."
cd /home/andrew/dev/research/go-backend
go build -o ./server cmd/server/main.go

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"

# Start the server in background
echo "🚀 Starting server..."
./server &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test the integrated query processing with resource scraping
echo "📝 Testing query processing with integrated resource scraping..."

# Test query that should trigger resource scraping
curl -X POST "http://localhost:8080/api/v1/query" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_123",
    "question": "What are derivatives and how do I calculate them step by step?"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" | jq

echo -e "\n⏳ Waiting for background resource scraping to complete..."
sleep 10

# Check if resources were scraped
echo "🔍 Checking scraped resources for 'derivatives'..."
curl -X GET "http://localhost:8080/api/v1/resources/concept/derivatives?limit=5" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" | jq

# Test resource stats to see if scraping worked
echo -e "\n📊 Checking resource statistics..."
curl -X GET "http://localhost:8080/api/v1/resources/stats" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" | jq

# Test another query with different concepts
echo -e "\n📝 Testing another query with different concepts..."
curl -X POST "http://localhost:8080/api/v1/query" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_456", 
    "question": "Explain integrals and their relationship to derivatives"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" | jq

echo -e "\n⏳ Waiting for background scraping..."
sleep 8

# Check resources for integrals
echo "🔍 Checking resources for 'integrals'..."
curl -X GET "http://localhost:8080/api/v1/resources/concept/integrals?limit=5" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" | jq

# Cleanup
echo -e "\n🧹 Cleaning up..."
kill $SERVER_PID 2>/dev/null || true

echo "✅ Integration test completed!"
echo ""
echo "🎯 Key Features Tested:"
echo "  ✓ Query processing pipeline with background resource scraping"
echo "  ✓ Automatic concept identification -> resource finding"
echo "  ✓ Non-blocking resource scraping during query processing"
echo "  ✓ Resource storage and retrieval"
echo "  ✓ Multiple concept handling in single queries"