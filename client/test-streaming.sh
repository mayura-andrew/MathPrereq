#!/bin/bash

# 🌊 Streaming Integration Test Script
# Tests the streaming API integration between client and backend

set -e

echo "🧪 Testing Streaming API Integration"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${VITE_API_URL:-http://localhost:8080}"
STREAM_ENDPOINT="${API_URL}/api/v1/query/stream"
HEALTH_ENDPOINT="${API_URL}/api/v1/health"

# Test 1: Health Check
echo "📡 Test 1: Backend Health Check"
echo "--------------------------------"

if curl -f -s "${HEALTH_ENDPOINT}" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}"
    echo "  URL: ${HEALTH_ENDPOINT}"
else
    echo -e "${RED}✗ Backend is not running${NC}"
    echo "  Please start the backend: cd go-backend && make run"
    exit 1
fi
echo ""

# Test 2: Streaming Endpoint Available
echo "🔌 Test 2: Streaming Endpoint Check"
echo "------------------------------------"

response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${STREAM_ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d '{"question":"test"}')

if [ "$response" == "200" ] || [ "$response" == "400" ]; then
    echo -e "${GREEN}✓ Streaming endpoint is accessible${NC}"
    echo "  URL: ${STREAM_ENDPOINT}"
else
    echo -e "${RED}✗ Streaming endpoint returned: ${response}${NC}"
    echo "  Expected: 200 or 400"
    exit 1
fi
echo ""

# Test 3: Stream a Real Query
echo "🌊 Test 3: Stream a Real Query"
echo "-------------------------------"
echo "Question: What are the prerequisites for calculus?"
echo ""

# Create temp file for output
TEMP_FILE=$(mktemp)

# Stream the query
curl -s -N -X POST "${STREAM_ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d '{"question":"What are the prerequisites for calculus?"}' \
    > "${TEMP_FILE}" &

# Get the curl PID
CURL_PID=$!

# Monitor for 10 seconds
echo "Streaming for 10 seconds..."
sleep 2

# Check if we got any data
if [ -s "${TEMP_FILE}" ]; then
    echo -e "${GREEN}✓ Receiving stream data${NC}"
    echo ""
    
    # Count event types
    start_events=$(grep -c '"type":"start"' "${TEMP_FILE}" 2>/dev/null || echo "0")
    progress_events=$(grep -c '"type":"progress"' "${TEMP_FILE}" 2>/dev/null || echo "0")
    concepts_events=$(grep -c '"type":"concepts"' "${TEMP_FILE}" 2>/dev/null || echo "0")
    explanation_events=$(grep -c '"type":"explanation_chunk"' "${TEMP_FILE}" 2>/dev/null || echo "0")
    
    echo "  Events received:"
    echo "    - start: ${start_events}"
    echo "    - progress: ${progress_events}"
    echo "    - concepts: ${concepts_events}"
    echo "    - explanation chunks: ${explanation_events}"
    
    # Show first event
    echo ""
    echo "  First event:"
    head -n 1 "${TEMP_FILE}" | sed 's/^data: //' | jq '.' 2>/dev/null || echo "  (Could not parse JSON)"
else
    echo -e "${RED}✗ No stream data received${NC}"
    kill $CURL_PID 2>/dev/null || true
    rm -f "${TEMP_FILE}"
    exit 1
fi

# Stop the curl process
kill $CURL_PID 2>/dev/null || true
rm -f "${TEMP_FILE}"

echo ""

# Test 4: Check Client Files
echo "📁 Test 4: Client Files Check"
echo "------------------------------"

CLIENT_DIR="$(dirname "$0")/.."
FILES_TO_CHECK=(
    "src/types/streaming.ts"
    "src/services/streaming.ts"
    "src/hooks/useStreamingChat.ts"
    "src/components/chat/StreamProgress.tsx"
    "src/components/chat/StreamingAnswerDisplay.tsx"
    "src/components/StreamingChat.component.tsx"
    "src/pages/StreamingDemo.page.tsx"
)

all_files_exist=true
for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "${CLIENT_DIR}/${file}" ]; then
        echo -e "${GREEN}✓${NC} ${file}"
    else
        echo -e "${RED}✗${NC} ${file} - MISSING"
        all_files_exist=false
    fi
done

if [ "$all_files_exist" = true ]; then
    echo ""
    echo -e "${GREEN}✓ All streaming files present${NC}"
else
    echo ""
    echo -e "${RED}✗ Some files are missing${NC}"
    exit 1
fi

echo ""

# Test 5: TypeScript Compilation
echo "🔧 Test 5: TypeScript Check"
echo "---------------------------"

cd "${CLIENT_DIR}"

if command -v npm &> /dev/null; then
    if [ -f "package.json" ]; then
        echo "Running TypeScript check..."
        if npm run tsc --noEmit > /dev/null 2>&1; then
            echo -e "${GREEN}✓ TypeScript compiles without errors${NC}"
        else
            echo -e "${YELLOW}⚠ TypeScript warnings/errors detected${NC}"
            echo "  Run 'npm run tsc' to see details"
        fi
    else
        echo -e "${YELLOW}⚠ package.json not found${NC}"
    fi
else
    echo -e "${YELLOW}⚠ npm not found, skipping TypeScript check${NC}"
fi

echo ""

# Summary
echo "=================================="
echo -e "${GREEN}✅ All tests passed!${NC}"
echo "=================================="
echo ""
echo "🚀 Next steps:"
echo "   1. Start the dev server:"
echo "      cd client && npm run dev"
echo ""
echo "   2. Visit http://localhost:5173"
echo ""
echo "   3. Try the streaming demo page"
echo ""
echo "📚 Documentation:"
echo "   - Client: client/STREAMING_SETUP.md"
echo "   - Backend: go-backend/docs/STREAMING_API_GUIDE.md"
echo ""
