#!/bin/bash

echo "🔧 Testing MongoDB Authentication Fix"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Step 1: Restart server to use shared MongoDB client...${NC}"
echo "Please restart your server: go run ./cmd/server"
echo ""
echo -e "${YELLOW}Press Enter when server is restarted...${NC}"
read

echo -e "${BLUE}Step 2: Testing simple learning resources request...${NC}"
curl -s -X POST http://localhost:8000/api/v1/learning-resources/find \
  -H "Content-Type: application/json" \
  -d '{
    "concept_name": "test_concept",
    "limit": 3
  }' | jq '{
    success: .success,
    concept_name: .concept_name,
    scraping_triggered: .scraping_triggered,
    total_resources: .total_resources,
    error_message: .error_message
  }'

echo ""
echo -e "${YELLOW}⏳ Waiting 15 seconds for background scraping...${NC}"
sleep 15

echo ""
echo -e "${BLUE}Step 3: Checking MongoDB for any stored resources...${NC}"
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --quiet --eval "
print('📊 MongoDB Status After Test:');
print('Total resources:', db.educational_resources.countDocuments());

if (db.educational_resources.countDocuments() > 0) {
  print('✅ SUCCESS: Resources were stored successfully!');
  print('');
  print('Sample resources:');
  db.educational_resources.find().limit(2).forEach(function(doc) {
    print('  • Concept:', doc.concept_id);
    print('    Title:', doc.title || 'N/A');
    print('    Source:', doc.source_domain || 'N/A');
    print('    Quality:', doc.quality_score || 'N/A');
    print('');
  });
} else {
  print('❌ No resources found - authentication may still be failing');
}
"

echo ""
echo -e "${BLUE}Step 4: Testing debug endpoint...${NC}"
curl -s "http://localhost:8000/api/v1/debug/learning-resources?concept=test_concept" | jq '{
  success: .success,
  service_available: .debug_info.service_available,
  total_resources: .debug_info.total_resources,
  error_details: .debug_info.error_details
}'

echo ""
echo -e "${YELLOW}🎯 What should happen now:${NC}"
echo "• ✅ No 'Command update requires authentication' errors"
echo "• ✅ Resources get stored in MongoDB"
echo "• ✅ Subsequent requests return stored resources"
echo ""
echo -e "${GREEN}If you still see authentication errors, check server logs for details.${NC}"