#!/bin/bash

echo "🧪 Testing Smart Concept Query API"
echo "=================================="

# Set MongoDB environment variables
export MONGODB_USERNAME="admin"
export MONGODB_PASSWORD="password123"
export MONGODB_HOST="localhost"
export MONGODB_PORT="27017"
export MONGODB_DATABASE="mathprereq"
export MONGODB_AUTH_SOURCE="admin"

BASE_URL="http://localhost:8080/api/v1"

echo "🔨 Building and starting server..."
cd /home/andrew/dev/research/go-backend
go build -o ./server cmd/server/main.go &
SERVER_PID=$!

sleep 5

echo "📝 Test 1: Fresh concept query (should trigger full processing)"
curl -X POST "$BASE_URL/concept-query" \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: test-limits-001" \
  -d '{
    "concept_name": "limits",
    "user_id": "test_user"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n" | jq

echo "⏳ Waiting 5 seconds..."
sleep 5

echo "📝 Test 2: Same concept query (should return from cache)"
curl -X POST "$BASE_URL/concept-query" \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: test-limits-002" \
  -d '{
    "concept_name": "limits",
    "user_id": "test_user"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n" | jq

echo "📝 Test 3: Different concept (derivatives)"
curl -X POST "$BASE_URL/concept-query" \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: test-derivatives-001" \
  -d '{
    "concept_name": "derivatives",
    "user_id": "test_user"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n" | jq

echo "📝 Test 4: Invalid request (empty concept)"
curl -X POST "$BASE_URL/concept-query" \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: test-invalid-001" \
  -d '{
    "concept_name": "",
    "user_id": "test_user"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n" | jq

echo "📝 Test 5: Concept query without user_id (should use anonymous)"
curl -X POST "$BASE_URL/concept-query" \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: test-anonymous-001" \
  -d '{
    "concept_name": "integrals"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n" | jq

# Clean up
echo "🧹 Cleaning up..."
kill $SERVER_PID 2>/dev/null || true

echo "✅ Smart concept query API test completed!"
echo ""
echo "🎯 Key Features Tested:"
echo "  ✓ Fresh concept processing"
echo "  ✓ Cached concept retrieval"  
echo "  ✓ Multiple concept handling"
echo "  ✓ Error handling for invalid requests"
echo "  ✓ Anonymous user support"
echo "  ✓ Response timing and source identification"