#!/bin/bash

echo "🔧 Debugging Learning Resources MongoDB Connection"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Step 1: Testing MongoDB connection directly...${NC}"
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --quiet --eval "
print('✅ MongoDB Connection Test:');
print('Database:', db.getName());
print('Collections:', db.getCollectionNames());
print('Educational resources count:', db.educational_resources.countDocuments());
print('');
print('📋 Testing write permissions...');
try {
  const testDoc = {
    test: true,
    created_at: new Date(),
    concept_id: 'test_concept'
  };
  const result = db.educational_resources.insertOne(testDoc);
  print('✅ Write test successful, inserted ID:', result.insertedId);
  
  // Clean up test document
  db.educational_resources.deleteOne({_id: result.insertedId});
  print('✅ Cleanup successful');
} catch (error) {
  print('❌ Write test failed:', error.message);
}
"

echo ""
echo -e "${BLUE}Step 2: Testing server health and debug endpoint...${NC}"
curl -s http://localhost:8000/health | jq .

echo ""
echo -e "${BLUE}Step 3: Testing learning resources debug endpoint...${NC}"
curl -s "http://localhost:8000/api/v1/debug/learning-resources?concept=derivatives" | jq .

echo ""
echo -e "${BLUE}Step 4: Testing learning resources stats...${NC}"
curl -s http://localhost:8000/api/v1/learning-resources/stats | jq .

echo ""
echo -e "${BLUE}Step 5: Triggering a simple scraping test...${NC}"
curl -s -X POST http://localhost:8000/api/v1/trigger-scraping \
  -H "Content-Type: application/json" \
  -d '{
    "concept_name": "test_concept"
  }' | jq .

echo ""
echo -e "${YELLOW}⏳ Waiting 10 seconds for any background processing...${NC}"
sleep 10

echo ""
echo -e "${BLUE}Step 6: Checking if any resources were created...${NC}"
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --quiet --eval "
print('📊 Final state:');
print('Total resources:', db.educational_resources.countDocuments());

if (db.educational_resources.countDocuments() > 0) {
  print('');
  print('📋 Sample resources:');
  db.educational_resources.find().limit(3).forEach(function(doc) {
    print('  • ID:', doc._id);
    print('    Concept:', doc.concept_id);
    print('    Title:', doc.title || 'N/A');
    print('    Source:', doc.source_domain || 'N/A');
    print('    Scraped:', doc.scraped_at || 'N/A');
    print('');
  });
} else {
  print('❌ No resources found - this indicates the scraping is not working');
}
"

echo ""
echo -e "${BLUE}Step 7: Testing direct resource finding...${NC}"
curl -s -X POST http://localhost:8000/api/v1/learning-resources/find \
  -H "Content-Type: application/json" \
  -d '{
    "concept_name": "derivatives",
    "force_refresh": false,
    "limit": 3
  }' | jq '{
    success: .success,
    total_resources: .total_resources,
    scraping_triggered: .scraping_triggered,
    error_message: .error_message,
    sample_resource: .resources[0]
  }'

echo ""
echo -e "${YELLOW}🔍 Debugging Summary:${NC}"
echo "1. ✅ Check MongoDB connection and permissions"
echo "2. ✅ Check server health and debug endpoint"
echo "3. ✅ Check learning resources service availability"
echo "4. ✅ Test manual scraping trigger"
echo "5. ✅ Check if resources are being stored"
echo "6. ✅ Test resource finding endpoint"
echo ""
echo -e "${GREEN}Check the output above for any error messages.${NC}"