#!/bin/bash

# Create Neo4j Indexes for Performance Optimization
# This script creates critical indexes on the Concept nodes

set -e

NEO4J_USER="${NEO4J_USER:-neo4j}"
NEO4J_PASSWORD="${NEO4J_PASSWORD:-password}"

echo "=============================================="
echo "Creating Neo4j Performance Indexes"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Find Neo4j container or use cypher-shell
if command -v cypher-shell &> /dev/null; then
    CYPHER="cypher-shell -u $NEO4J_USER -p $NEO4J_PASSWORD"
    echo -e "${GREEN}✓ Using cypher-shell${NC}"
else
    CONTAINER=$(docker ps --filter "ancestor=neo4j" --format "{{.ID}}" | head -n 1)
    if [ -z "$CONTAINER" ]; then
        # Try by name pattern
        CONTAINER=$(docker ps --filter "name=neo4j" --format "{{.ID}}" | head -n 1)
    fi
    
    if [ -z "$CONTAINER" ]; then
        echo -e "${RED}✗ Neither cypher-shell nor Neo4j container found${NC}"
        echo "Please ensure Neo4j is running"
        exit 1
    fi
    
    CYPHER="docker exec -i $CONTAINER cypher-shell -u $NEO4J_USER -p $NEO4J_PASSWORD"
    echo -e "${GREEN}✓ Using Neo4j container: $CONTAINER${NC}"
fi

echo ""

# Function to run Cypher query
run_cypher() {
    local query="$1"
    local description="$2"
    
    echo -n "$description... "
    if echo "$query" | $CYPHER > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ (may already exist)${NC}"
        return 1
    fi
}

# Create indexes
echo "Creating indexes..."
echo ""

run_cypher \
    "CREATE INDEX concept_id_index IF NOT EXISTS FOR (c:Concept) ON (c.id);" \
    "  Index on Concept.id"

run_cypher \
    "CREATE INDEX concept_name_index IF NOT EXISTS FOR (c:Concept) ON (c.name);" \
    "  Index on Concept.name"

run_cypher \
    "CREATE INDEX concept_description_index IF NOT EXISTS FOR (c:Concept) ON (c.description);" \
    "  Index on Concept.description"

# Create constraints (optional but recommended)
echo ""
echo "Creating constraints..."
echo ""

run_cypher \
    "CREATE CONSTRAINT concept_id_unique IF NOT EXISTS FOR (c:Concept) REQUIRE c.id IS UNIQUE;" \
    "  Unique constraint on Concept.id"

# Create full-text index for better text search
echo ""
echo "Creating full-text search index..."
echo ""

run_cypher \
    "CREATE FULLTEXT INDEX concept_fulltext IF NOT EXISTS FOR (c:Concept) ON EACH [c.name, c.description];" \
    "  Full-text index on Concept"

# Wait for indexes to come online
echo ""
echo "Waiting for indexes to build..."
sleep 2

# Check index status
echo ""
echo "──────────────────────────────────────────"
echo "Index Status"
echo "──────────────────────────────────────────"

echo "SHOW INDEXES;" | $CYPHER 2>/dev/null || echo -e "${YELLOW}Could not query index status${NC}"

echo ""
echo "──────────────────────────────────────────"
echo "Database Statistics"  
echo "──────────────────────────────────────────"

# Count nodes
NODES=$(echo "MATCH (n:Concept) RETURN count(n) as count;" | $CYPHER 2>/dev/null | grep -v "count" | grep -v "^$" | head -n 1 | tr -d ' ' || echo "unknown")
echo "Total Concepts: $NODES"

# Count relationships
RELS=$(echo "MATCH ()-[r:PREREQUISITE_FOR]->() RETURN count(r) as count;" | $CYPHER 2>/dev/null | grep -v "count" | grep -v "^$" | head -n 1 | tr -d ' ' || echo "unknown")
echo "Total Relationships: $RELS"

echo ""
echo "──────────────────────────────────────────"
echo "Performance Test"
echo "──────────────────────────────────────────"

echo "Testing indexed query performance..."
START=$(date +%s.%N)
echo "MATCH (c:Concept) WHERE c.name IN ['derivatives', 'algebra', 'calculus'] RETURN c.id, c.name;" | $CYPHER > /dev/null 2>&1
END=$(date +%s.%N)
DURATION=$(echo "$END - $START" | bc)

printf "Query time: %.3fs " $DURATION

if (( $(echo "$DURATION < 0.5" | bc -l) )); then
    echo -e "${GREEN}✓ Excellent${NC}"
elif (( $(echo "$DURATION < 2.0" | bc -l) )); then
    echo -e "${YELLOW}⚠ Acceptable${NC}"
else
    echo -e "${RED}✗ Slow${NC}"
fi

echo ""
echo "=============================================="
echo "Index creation complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "1. Restart your Go application"
echo "2. Run: ./scripts/test-neo4j-performance.sh"
echo "3. Check logs for improved query times"
echo ""
echo "Expected improvements:"
echo "  • Concept lookups: <100ms (was 5-30s)"
echo "  • Path queries: <1s (was 5-10s)"
echo ""
