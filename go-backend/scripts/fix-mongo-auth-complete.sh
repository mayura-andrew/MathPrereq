#!/bin/bash

echo "🔧 Complete MongoDB Authentication Fix and Test"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}This script will fix the MongoDB authentication issues step by step.${NC}"
echo ""

# Step 1: Test basic MongoDB connection
echo -e "${BLUE}Step 1: Testing basic MongoDB connection...${NC}"
chmod +x scripts/test-mongo-basic.sh
./scripts/test-mongo-basic.sh

echo ""

# Step 2: Restart MongoDB container to ensure clean state
echo -e "${BLUE}Step 2: Restarting MongoDB container for clean authentication...${NC}"
docker-compose restart mongodb
echo "Waiting for MongoDB to be ready..."
sleep 15

# Step 3: Test connection again
echo -e "${BLUE}Step 3: Testing MongoDB connection after restart...${NC}"
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --quiet --eval "
print('✅ Post-restart MongoDB test:');
print('Connection:', db.runCommand({ping: 1}).ok === 1 ? 'SUCCESS' : 'FAILED');
print('Database:', db.getName());
print('Authentication:', db.runCommand({connectionStatus: 1}).authInfo.authenticatedUsers.length > 0 ? 'AUTHENTICATED' : 'NOT AUTHENTICATED');
"

echo ""

# Step 4: Instructions for server restart
echo -e "${YELLOW}Step 4: Server restart required${NC}"
echo "Your server needs to be restarted to use the updated MongoDB client configuration."
echo ""
echo -e "${BLUE}Please restart your server now:${NC}"
echo "1. Stop current server (Ctrl+C if running)"
echo "2. Run: go run ./cmd/server"
echo "3. Look for this log message: 'Web scraper initialized successfully with shared MongoDB client'"
echo ""

# Step 5: Test after server restart (instructions)
echo -e "${YELLOW}Step 5: After server restart, test the API:${NC}"
echo ""
echo "curl -X POST http://localhost:8000/api/v1/learning-resources/find \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"concept_name\": \"derivatives\", \"limit\": 3}'"
echo ""

echo -e "${GREEN}🎯 Expected Results:${NC}"
echo "✅ No 'Command update requires authentication' errors"
echo "✅ Server logs show 'Web scraper initialized successfully with shared MongoDB client'"
echo "✅ API returns learning resources (may take a few seconds for scraping)"
echo ""

echo -e "${YELLOW}📝 Key Changes Made:${NC}"
echo "• MongoDB client is now mandatory (not optional)"
echo "• Proper error handling for MongoDB initialization"
echo "• Shared authenticated client between server and scraper"
echo "• Connection tested before proceeding"
echo ""

echo -e "${BLUE}If issues persist after server restart:${NC}"
echo "1. Check that MongoDB container is running: docker-compose ps mongodb"
echo "2. Check server logs for 'MongoDB connection verified successfully'"
echo "3. Verify the scraper initialization message appears"
echo ""
echo -e "${GREEN}✅ MongoDB authentication fix preparation completed!${NC}"
echo -e "${YELLOW}👉 Now restart your server and test the API.${NC}"