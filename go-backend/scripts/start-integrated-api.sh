#!/bin/bash

echo "🚀 Setting up Integrated Learning Resources API"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Starting MongoDB...${NC}"
make mongodb-up

echo ""
echo -e "${BLUE}Step 2: Starting other services (Neo4j, Weaviate)...${NC}"
docker-compose up neo4j weaviate -d

echo ""
echo -e "${BLUE}Step 3: Waiting for services to be ready...${NC}"
sleep 15

echo ""
echo -e "${BLUE}Step 4: Running database migrations...${NC}"
go run ./cmd/migrate/*.go

echo ""
echo -e "${BLUE}Step 5: Starting the integrated API server...${NC}"
echo -e "${YELLOW}🔧 The server includes:${NC}"
echo "• Main API endpoints (query, concept-detail, etc.)"
echo "• Integrated web scraper for educational resources"
echo "• MongoDB for storing scraped learning resources"
echo "• Manual scraping triggers via API"
echo ""
echo -e "${YELLOW}📱 API will be available at: http://localhost:8000${NC}"
echo ""
echo -e "${GREEN}🎯 To test the integrated system after the server starts:${NC}"
echo "make test-integrated-api"
echo ""
echo -e "${YELLOW}Starting server now...${NC}"

# Start the server
go run ./cmd/server