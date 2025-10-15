#!/bin/bash

# Neo4j Query Performance Diagnostics
# Checks for indexes, constraints, and query performance

set -e

NEO4J_URI="${NEO4J_URI:-neo4j://localhost:7687}"
NEO4J_USER="${NEO4J_USER:-neo4j}"
NEO4J_PASSWORD="${NEO4J_PASSWORD:-password}"

echo "=============================================="
echo "Neo4J Query Performance Diagnostics"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if cypher-shell is available
if ! command -v cypher-shell &> /dev/null; then
    echo -e "${YELLOW}⚠ cypher-shell not found, trying docker...${NC}"
    
    # Try docker
    CONTAINER=$(docker ps --filter "ancestor=neo4j" --format "{{.ID}}" | head -n 1)
    if [ -z "$CONTAINER" ]; then
        echo -e "${RED}✗ Neither cypher-shell nor Neo4j docker container found${NC}"
        echo "Please install cypher-shell or ensure Neo4j docker is running"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Found Neo4j container: $CONTAINER${NC}"
    CYPHER="docker exec -it $CONTAINER cypher-shell -u $NEO4J_USER -p $NEO4J_PASSWORD"
else
    CYPHER="cypher-shell -a $NEO4J_URI -u $NEO4J_USER -p $NEO4J_PASSWORD"
fi

echo ""
echo "──────────────────────────────────────────"
echo "1. Checking Database Indexes"
echo "──────────────────────────────────────────"

INDEXES=$($CYPHER "SHOW INDEXES;" 2>/dev/null || echo "error")

if [ "$INDEXES" = "error" ]; then
    echo -e "${RED}✗ Failed to query indexes${NC}"
else
    echo "$INDEXES"
    
    # Check for critical indexes
    if echo "$INDEXES" | grep -qi "Concept.*id"; then
        echo -e "${GREEN}✓ Index on Concept.id exists${NC}"
    else
        echo -e "${RED}✗ Missing index on Concept.id${NC}"
        echo -e "${YELLOW}  Run: CREATE INDEX concept_id_index IF NOT EXISTS FOR (c:Concept) ON (c.id)${NC}"
    fi
    
    if echo "$INDEXES" | grep -qi "Concept.*name"; then
        echo -e "${GREEN}✓ Index on Concept.name exists${NC}"
    else
        echo -e "${RED}✗ Missing index on Concept.name${NC}"
        echo -e "${YELLOW}  Run: CREATE INDEX concept_name_index IF NOT EXISTS FOR (c:Concept) ON (c.name)${NC}"
    fi
fi

echo ""
echo "──────────────────────────────────────────"
echo "2. Checking Database Constraints"
echo "──────────────────────────────────────────"

CONSTRAINTS=$($CYPHER "SHOW CONSTRAINTS;" 2>/dev/null || echo "error")

if [ "$CONSTRAINTS" = "error" ]; then
    echo -e "${RED}✗ Failed to query constraints${NC}"
else
    echo "$CONSTRAINTS"
    
    if echo "$CONSTRAINTS" | grep -qi "Concept"; then
        echo -e "${GREEN}✓ Constraints on Concept exist${NC}"
    else
        echo -e "${YELLOW}⚠ No constraints on Concept${NC}"
    fi
fi

echo ""
echo "──────────────────────────────────────────"
echo "3. Database Statistics"
echo "──────────────────────────────────────────"

# Count nodes
NODE_COUNT=$($CYPHER "MATCH (n:Concept) RETURN count(n) as count;" 2>/dev/null | grep -v "count" | grep -v "^$" | tr -d ' ' || echo "0")
echo "Total Concepts: $NODE_COUNT"

# Count relationships
REL_COUNT=$($CYPHER "MATCH ()-[r:PREREQUISITE_FOR]->() RETURN count(r) as count;" 2>/dev/null | grep -v "count" | grep -v "^$" | tr -d ' ' || echo "0")
echo "Total PREREQUISITE_FOR relationships: $REL_COUNT"

if [ "$NODE_COUNT" -gt 1000 ] || [ "$REL_COUNT" -gt 5000 ]; then
    echo -e "${YELLOW}⚠ Large graph detected - indexes are critical!${NC}"
fi

echo ""
echo "──────────────────────────────────────────"
echo "4. Test Query Performance"
echo "──────────────────────────────────────────"

echo "Testing concept lookup query..."
START_TIME=$(date +%s.%N)
$CYPHER "MATCH (c:Concept) WHERE c.name IN ['derivatives', 'volume'] RETURN c.id, c.name LIMIT 10;" > /dev/null 2>&1
END_TIME=$(date +%s.%N)
LOOKUP_TIME=$(echo "$END_TIME - $START_TIME" | bc)
printf "Concept lookup time: %.3fs\n" $LOOKUP_TIME

if (( $(echo "$LOOKUP_TIME < 0.5" | bc -l) )); then
    echo -e "${GREEN}✓ Lookup performance is good${NC}"
elif (( $(echo "$LOOKUP_TIME < 2.0" | bc -l) )); then
    echo -e "${YELLOW}⚠ Lookup performance is acceptable but could be better${NC}"
else
    echo -e "${RED}✗ Lookup performance is poor - indexes needed!${NC}"
fi

echo ""
echo "Testing prerequisite path query..."
START_TIME=$(date +%s.%N)
$CYPHER "MATCH (target:Concept {name: 'calculus'}) MATCH path = (prerequisite:Concept)-[:PREREQUISITE_FOR*1..5]->(target) RETURN DISTINCT prerequisite.id LIMIT 20;" > /dev/null 2>&1
END_TIME=$(date +%s.%N)
PATH_TIME=$(echo "$END_TIME - $START_TIME" | bc)
printf "Path query time: %.3fs\n" $PATH_TIME

if (( $(echo "$PATH_TIME < 1.0" | bc -l) )); then
    echo -e "${GREEN}✓ Path query performance is good${NC}"
elif (( $(echo "$PATH_TIME < 3.0" | bc -l) )); then
    echo -e "${YELLOW}⚠ Path query performance is acceptable${NC}"
else
    echo -e "${RED}✗ Path query performance is poor!${NC}"
fi

echo ""
echo "──────────────────────────────────────────"
echo "5. Recommendations"
echo "──────────────────────────────────────────"

if [ "$INDEXES" = "error" ] || ! echo "$INDEXES" | grep -qi "Concept"; then
    echo -e "${BLUE}Create missing indexes:${NC}"
    echo ""
    echo "CREATE INDEX concept_id_index IF NOT EXISTS FOR (c:Concept) ON (c.id);"
    echo "CREATE INDEX concept_name_index IF NOT EXISTS FOR (c:Concept) ON (c.name);"
    echo ""
fi

if (( $(echo "$PATH_TIME > 2.0" | bc -l) )); then
    echo -e "${BLUE}Query Optimizations:${NC}"
    echo "1. Limit path depth: [:PREREQUISITE_FOR*1..5] ✅ (already done)"
    echo "2. Add LIMIT clauses to prevent full graph scan"
    echo "3. Ensure relationship indexes exist"
    echo ""
fi

if [ "$NODE_COUNT" -gt 10000 ]; then
    echo -e "${BLUE}Large Graph Optimizations:${NC}"
    echo "1. Consider graph projections for common queries"
    echo "2. Use Neo4j Graph Data Science library"
    echo "3. Implement result caching in application layer"
    echo ""
fi

echo "──────────────────────────────────────────"
echo "Summary"
echo "──────────────────────────────────────────"
echo "Concepts: $NODE_COUNT"
echo "Relationships: $REL_COUNT"
printf "Lookup Performance: %.3fs " $LOOKUP_TIME
if (( $(echo "$LOOKUP_TIME < 0.5" | bc -l) )); then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC}"
fi

printf "Path Performance: %.3fs " $PATH_TIME
if (( $(echo "$PATH_TIME < 1.0" | bc -l) )); then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC}"
fi

echo ""
echo "For detailed diagnostics, check Neo4j Browser at http://localhost:7474"
