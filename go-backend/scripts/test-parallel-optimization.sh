#!/bin/bash

# Test script to validate parallel pipeline optimization
# This script tests the query endpoint and analyzes timing

set -e

API_URL="${API_URL:-http://localhost:8080}"
TEST_USER="test-optimization-user"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing Parallel RAG Pipeline Optimization"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test query that requires all three data sources
TEST_QUERY='A conical water tank (point down) has a height of 6 m and a base radius of 3 m.
Water is being poured into the tank at a rate of 2 m³/min.

How fast is the water level rising when the water is 2 meters deep?'

echo "📝 Test Query:"
echo "$TEST_QUERY"
echo ""

echo "🚀 Sending request to $API_URL/api/v1/query..."
echo ""

START_TIME=$(date +%s.%N)

RESPONSE=$(curl -s -X POST "$API_URL/api/v1/query" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "question": "$TEST_QUERY",
  "user_id": "$TEST_USER"
}
EOF
)

END_TIME=$(date +%s.%N)
TOTAL_TIME=$(echo "$END_TIME - $START_TIME" | bc)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Response Metrics"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Parse response
IDENTIFIED_CONCEPTS=$(echo "$RESPONSE" | jq -r '.identified_concepts | length')
PREREQ_PATH_LENGTH=$(echo "$RESPONSE" | jq -r '.prerequisite_path | length')
CONTEXT_CHUNKS=$(echo "$RESPONSE" | jq -r '.retrieved_context | length')
EXPLANATION_LENGTH=$(echo "$RESPONSE" | jq -r '.explanation | length')

echo "⏱️  Total Response Time: ${TOTAL_TIME}s"
echo "🔍 Identified Concepts: $IDENTIFIED_CONCEPTS"
echo "📚 Prerequisite Path Length: $PREREQ_PATH_LENGTH"
echo "📄 Context Chunks Retrieved: $CONTEXT_CHUNKS"
echo "✍️  Explanation Length: $EXPLANATION_LENGTH characters"
echo ""

# Check logs for parallel fetch timing
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Analyzing Logs for Parallel Fetch Performance"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Look for parallel fetch logs (last 20 lines)
if command -v jq &> /dev/null; then
  echo "Looking for parallel fetch timing in recent logs..."
  echo ""
  
  # Check if logs are available
  if docker logs mathprereq-api 2>&1 | tail -50 | grep -q "Parallel data fetch"; then
    echo "✅ Found parallel fetch logs:"
    docker logs mathprereq-api 2>&1 | tail -50 | grep "Parallel data fetch" | jq -r '
      "  • " + .msg + 
      " | Elapsed: " + (.elapsed // "N/A") + 
      " | Completed: " + (.completed | tostring // "N/A")
    ' 2>/dev/null || echo "  (JSON parsing failed)"
  else
    echo "⚠️  No parallel fetch logs found in recent output"
  fi
  echo ""
  
  echo "Looking for individual fetch timings..."
  echo ""
  
  # Neo4j timing
  if docker logs mathprereq-api 2>&1 | tail -50 | grep -q "Prerequisites fetched"; then
    docker logs mathprereq-api 2>&1 | tail -50 | grep "Prerequisites fetched" | jq -r '
      "  ✓ Neo4j: " + (.duration // "N/A") + " | Count: " + (.count | tostring // "0")
    ' 2>/dev/null | tail -1 || echo "  ✓ Neo4j: Found (JSON parse failed)"
  fi
  
  # Weaviate timing
  if docker logs mathprereq-api 2>&1 | tail -50 | grep -q "Vector chunks received"; then
    docker logs mathprereq-api 2>&1 | tail -50 | grep "Vector chunks received" | jq -r '
      "  ✓ Weaviate: Count: " + (.count | tostring // "0")
    ' 2>/dev/null | tail -1 || echo "  ✓ Weaviate: Found (JSON parse failed)"
  fi
  
  # Resources timing
  if docker logs mathprereq-api 2>&1 | tail -50 | grep -q "Resources received"; then
    docker logs mathprereq-api 2>&1 | tail -50 | grep "Resources received" | jq -r '
      "  ✓ Resources: Count: " + (.count | tostring // "0")
    ' 2>/dev/null | tail -1 || echo "  ✓ Resources: Found (JSON parse failed)"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Performance Expectations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Target Metrics (after optimization):"
echo "  • Total query time: < 20 seconds"
echo "  • Parallel fetch: < 3 seconds"
echo "  • Neo4j batch lookup: < 1 second"
echo "  • No timeout errors"
echo "  • All 3 sources complete successfully"
echo ""

# Performance assessment
if (( $(echo "$TOTAL_TIME < 20" | bc -l) )); then
  echo "✅ Performance: GOOD (${TOTAL_TIME}s < 20s target)"
elif (( $(echo "$TOTAL_TIME < 25" | bc -l) )); then
  echo "⚠️  Performance: ACCEPTABLE (${TOTAL_TIME}s, room for improvement)"
else
  echo "❌ Performance: NEEDS OPTIMIZATION (${TOTAL_TIME}s > 25s)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 Troubleshooting Tips"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "If seeing timeout errors:"
echo "  1. Check Neo4j connection: docker logs neo4j"
echo "  2. Check Weaviate: docker logs weaviate"
echo "  3. Review docs/NEO4J_OPTIMIZATION.md"
echo "  4. Monitor: docker logs -f mathprereq-api | grep 'Parallel fetch'"
echo ""
echo "For detailed analysis:"
echo "  docker logs mathprereq-api 2>&1 | grep -E '(Parallel|Prerequisites|Vector|Resources)'"
echo ""
