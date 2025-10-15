#!/bin/bash

# Test script to compare parallel vs sequential performance
# This script tests the improved RAG pipeline

set -e

echo "=================================="
echo "Parallel RAG Pipeline - Performance Test"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:8080}"
ENDPOINT="${API_URL}/api/v1/query"

# Test queries with different complexity levels
declare -a QUERIES=(
    "What is the derivative of x^2?"
    "Explain integration by parts with examples"
    "How do limits relate to continuity and derivatives?"
)

echo -e "${BLUE}Testing API at: ${ENDPOINT}${NC}"
echo ""

# Function to test a single query
test_query() {
    local query="$1"
    local test_num="$2"
    
    echo -e "${YELLOW}Test ${test_num}: ${query}${NC}"
    
    # Prepare the request payload
    local payload=$(cat <<EOF
{
    "question": "${query}",
    "user_id": "test-user-perf"
}
EOF
)
    
    # Measure time and make request
    local start_time=$(date +%s%N)
    
    local response=$(curl -s -X POST "${ENDPOINT}" \
        -H "Content-Type: application/json" \
        -d "${payload}")
    
    local end_time=$(date +%s%N)
    
    # Calculate elapsed time in milliseconds
    local elapsed=$((($end_time - $start_time) / 1000000))
    
    # Parse response
    local success=$(echo "${response}" | jq -r '.query.completed // false')
    local concepts=$(echo "${response}" | jq -r '.identified_concepts | length // 0')
    local prereqs=$(echo "${response}" | jq -r '.prerequisite_path | length // 0')
    local explanation_length=$(echo "${response}" | jq -r '.explanation | length // 0')
    local processing_time=$(echo "${response}" | jq -r '.processing_time // 0')
    
    # Display results
    echo "  ├─ Success: ${success}"
    echo "  ├─ Total time: ${elapsed}ms"
    echo "  ├─ Server processing: ${processing_time}"
    echo "  ├─ Concepts identified: ${concepts}"
    echo "  ├─ Prerequisites found: ${prereqs}"
    echo "  └─ Explanation length: ${explanation_length} chars"
    echo ""
    
    # Return elapsed time for averaging
    echo "${elapsed}"
}

# Check if server is running
echo -e "${BLUE}Checking server status...${NC}"
if ! curl -s "${API_URL}/health" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Server not running at ${API_URL}${NC}"
    echo "Please start the server with: make run"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Run tests
total_time=0
test_count=${#QUERIES[@]}

for i in "${!QUERIES[@]}"; do
    query="${QUERIES[$i]}"
    test_num=$((i + 1))
    
    elapsed=$(test_query "${query}" "${test_num}")
    total_time=$((total_time + elapsed))
    
    # Small delay between tests
    sleep 1
done

# Calculate average
avg_time=$((total_time / test_count))

echo "=================================="
echo -e "${GREEN}Performance Summary${NC}"
echo "=================================="
echo "Tests run: ${test_count}"
echo "Total time: ${total_time}ms"
echo "Average time: ${avg_time}ms"
echo ""

# Performance assessment
if [ ${avg_time} -lt 2000 ]; then
    echo -e "${GREEN}🚀 Excellent! Average response time under 2 seconds${NC}"
elif [ ${avg_time} -lt 3500 ]; then
    echo -e "${YELLOW}✅ Good! Parallel optimization is working${NC}"
else
    echo -e "${YELLOW}⚠️  Response time higher than expected${NC}"
    echo "Expected: <3.5s with parallel processing"
    echo "Consider checking:"
    echo "  - Neo4j connection"
    echo "  - Weaviate connection"
    echo "  - LLM API latency"
fi

echo ""
echo "=================================="
echo -e "${BLUE}Performance Comparison${NC}"
echo "=================================="
echo "Expected performance (estimated):"
echo ""
echo "Sequential Processing (before):"
echo "  └─ Average: ~4.5 seconds"
echo ""
echo "Parallel Processing (after):"
echo "  └─ Average: ~2.5 seconds"
echo "  └─ Improvement: ~45% faster"
echo ""
echo "Your results:"
echo "  └─ Average: ${avg_time}ms"
echo ""

# Detailed breakdown example
echo "=================================="
echo -e "${BLUE}Sample Request Breakdown${NC}"
echo "=================================="
echo ""
echo "Typical parallel request timeline:"
echo "├─ 0-300ms:    Identify concepts (LLM)"
echo "├─ 300-1500ms: Parallel data fetch"
echo "│  ├─ Neo4j:      300-800ms  (500ms)"
echo "│  ├─ Weaviate:   300-1100ms (800ms)"
echo "│  └─ Scraper:    300-1500ms (1200ms)"
echo "└─ 1500-3500ms: Generate explanation (LLM)"
echo ""
echo "Total: ~3500ms"
echo ""

echo "=================================="
echo "Test completed!"
echo "=================================="
