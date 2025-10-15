#!/bin/bash

# Neo4j Connection & Performance Test Script
# Tests the timeout fixes and connection pool configuration

set -e

API_URL="${API_URL:-http://localhost:8080}"
TIMEOUT=30  # Allow 30 seconds for query (should complete in <5s with fixes)

echo "=============================================="
echo "Neo4j Timeout Fix Verification Test"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if server is running
check_server() {
    echo -n "Checking if API server is running... "
    if curl -s "${API_URL}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${RED}✗ Not running${NC}"
        echo "Please start the server with: make run"
        exit 1
    fi
}

# Function to test query performance
test_query_performance() {
    local query="$1"
    local test_name="$2"
    
    echo ""
    echo "──────────────────────────────────────────"
    echo "Test: $test_name"
    echo "──────────────────────────────────────────"
    
    local start_time=$(date +%s.%N)
    
    # Make the request
    local response=$(curl -s -w "\n%{http_code}" \
        -X POST "${API_URL}/api/v1/query" \
        -H "Content-Type: application/json" \
        -d "{\"question\": \"$query\"}" \
        --max-time $TIMEOUT)
    
    local http_code=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | head -n -1)
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    # Check if request succeeded
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ Request succeeded (HTTP $http_code)${NC}"
        
        # Parse response
        local concepts=$(echo "$body" | jq -r '.identified_concepts | length // 0')
        local prereq_count=$(echo "$body" | jq -r '.prerequisite_path | length // 0')
        local context_chunks=$(echo "$body" | jq -r '.retrieved_context | length // 0')
        local explanation_length=$(echo "$body" | jq -r '.explanation | length // 0')
        
        echo "  Duration: ${duration}s"
        echo "  Concepts identified: $concepts"
        echo "  Prerequisites found: $prereq_count"
        echo "  Context chunks: $context_chunks"
        echo "  Explanation length: $explanation_length chars"
        
        # Performance check
        if (( $(echo "$duration < 5.0" | bc -l) )); then
            echo -e "  Performance: ${GREEN}✓ Excellent (<5s)${NC}"
        elif (( $(echo "$duration < 10.0" | bc -l) )); then
            echo -e "  Performance: ${YELLOW}⚠ Acceptable (<10s)${NC}"
        else
            echo -e "  Performance: ${RED}✗ Slow (>10s)${NC}"
            echo "  This suggests Neo4j is still timing out or slow"
        fi
        
        return 0
    else
        echo -e "${RED}✗ Request failed (HTTP $http_code)${NC}"
        echo "Response: $body"
        return 1
    fi
}

# Function to check logs for timeout errors
check_logs() {
    echo ""
    echo "──────────────────────────────────────────"
    echo "Checking Recent Logs for Errors"
    echo "──────────────────────────────────────────"
    
    if [ -f "logs/app.log" ]; then
        local timeout_errors=$(tail -n 100 logs/app.log | grep -i "timeout" || true)
        local neo4j_errors=$(tail -n 100 logs/app.log | grep -i "neo4j.*error" || true)
        
        if [ -z "$timeout_errors" ] && [ -z "$neo4j_errors" ]; then
            echo -e "${GREEN}✓ No timeout or Neo4j errors in recent logs${NC}"
        else
            if [ -n "$timeout_errors" ]; then
                echo -e "${YELLOW}⚠ Found timeout warnings:${NC}"
                echo "$timeout_errors" | head -n 5
            fi
            if [ -n "$neo4j_errors" ]; then
                echo -e "${RED}✗ Found Neo4j errors:${NC}"
                echo "$neo4j_errors" | head -n 5
            fi
        fi
    else
        echo -e "${YELLOW}⚠ No log file found${NC}"
    fi
}

# Function to test connection pool
test_concurrent_requests() {
    echo ""
    echo "──────────────────────────────────────────"
    echo "Testing Connection Pool (Concurrent Requests)"
    echo "──────────────────────────────────────────"
    
    local num_requests=5
    echo "Sending $num_requests concurrent requests..."
    
    local start_time=$(date +%s.%N)
    
    # Launch concurrent requests
    for i in $(seq 1 $num_requests); do
        (curl -s -X POST "${API_URL}/api/v1/query" \
            -H "Content-Type: application/json" \
            -d '{"question": "What is a derivative?"}' \
            --max-time $TIMEOUT > /dev/null) &
    done
    
    # Wait for all to complete
    wait
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    echo -e "${GREEN}✓ All $num_requests requests completed${NC}"
    echo "  Total time: ${duration}s"
    
    local avg_time=$(echo "$duration / $num_requests" | bc -l)
    printf "  Average: %.2fs per request\n" $avg_time
    
    if (( $(echo "$duration < 15.0" | bc -l) )); then
        echo -e "  Connection pool: ${GREEN}✓ Working well${NC}"
    else
        echo -e "  Connection pool: ${YELLOW}⚠ May need tuning${NC}"
    fi
}

# Main test execution
main() {
    echo "API URL: $API_URL"
    echo ""
    
    # Pre-flight checks
    check_server
    
    # Test 1: Simple query
    test_query_performance \
        "What is a derivative?" \
        "Simple Query (Single Concept)"
    
    # Test 2: Complex query with multiple concepts
    test_query_performance \
        "Explain related rates with volume and cones" \
        "Complex Query (Multiple Concepts)"
    
    # Test 3: Very complex calculus problem
    test_query_performance \
        "A conical water tank has a height of 6m and base radius 3m. Water is being poured in at 2 m³/min. How fast is the water level rising when the water is 2m deep?" \
        "Complex Problem (Real-World Application)"
    
    # Test 4: Concurrent requests
    test_concurrent_requests
    
    # Check logs
    check_logs
    
    echo ""
    echo "=============================================="
    echo "Test Summary"
    echo "=============================================="
    echo ""
    echo "If all tests passed:"
    echo "  ${GREEN}✓${NC} Neo4j timeout fixes are working"
    echo "  ${GREEN}✓${NC} Connection pool is configured properly"
    echo "  ${GREEN}✓${NC} Parallel fetching is operational"
    echo ""
    echo "If tests are slow or failing:"
    echo "  1. Check Neo4j is running: docker ps | grep neo4j"
    echo "  2. Check Neo4j connectivity: curl http://localhost:7474"
    echo "  3. Review logs: tail -f logs/app.log"
    echo "  4. See docs/NEO4J_TIMEOUT_FIX.md for troubleshooting"
    echo ""
}

# Run tests
main
