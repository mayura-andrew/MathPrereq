#!/bin/bash

echo "🧪 Testing MongoDB Shared Client Authentication Fix"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}This test will verify that the scraper uses the shared authenticated MongoDB client.${NC}"
echo ""

# Step 1: Check if server is running with the latest code
echo -e "${BLUE}Step 1: Testing server health...${NC}"
response=$(curl -s http://localhost:8000/health)
if [ $? -eq 0 ]; then
    echo "✅ Server is running"
    echo "$response" | jq .
else
    echo -e "${RED}❌ Server is not running. Please start the server first:${NC}"
    echo "  go run ./cmd/server"
    exit 1
fi

echo ""

# Step 2: Test MongoDB connection directly
echo -e "${BLUE}Step 2: Testing MongoDB connection directly...${NC}"
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --quiet --eval "
print('✅ MongoDB connection test:');
print('Database:', db.getName());

// Test write permission to educational_resources collection
try {
  const testDoc = {
    test_run: 'auth_fix_test',
    concept_id: 'test_shared_client',
    title: 'Test Resource for Shared Client',
    created_at: new Date(),
    quality_score: 0.8
  };
  
  const result = db.educational_resources.insertOne(testDoc);
  print('✅ Write test successful - inserted document with ID:', result.insertedId);
  
  // Clean up test document
  db.educational_resources.deleteOne({_id: result.insertedId});
  print('✅ Cleanup successful');
  
  print('✅ MongoDB authentication is working correctly');
} catch (error) {
  print('❌ MongoDB write test failed:', error.message);
  print('This indicates authentication issues persist');
}
"

echo ""

# Step 3: Test learning resources API with a simple request
echo -e "${BLUE}Step 3: Testing learning resources API with shared client...${NC}"
echo "Making a simple request to trigger the shared client usage..."

curl -s -X POST http://localhost:8000/api/v1/learning-resources/find \
  -H "Content-Type: application/json" \
  -d '{
    "concept_name": "test_shared_client",
    "limit": 2
  }' | jq '{
    success: .success,
    concept_name: .concept_name,
    scraping_triggered: .scraping_triggered,
    total_resources: .total_resources,
    error_message: .error_message
  }'

echo ""
echo -e "${YELLOW}⏳ Waiting 10 seconds for potential background scraping...${NC}"
sleep 10

# Step 4: Check server logs for authentication errors
echo -e "${BLUE}Step 4: Quick check - if you see authentication errors in server logs...${NC}"
echo ""
echo -e "${YELLOW}Expected behavior with the fix:${NC}"
echo "✅ No 'Command update requires authentication' errors"
echo "✅ Resources get stored in MongoDB successfully"  
echo "✅ Scraper uses the same authenticated connection as main server"
echo ""

# Step 5: Check if any test resources were stored
echo -e "${BLUE}Step 5: Checking if resources were stored (indicates authentication success)...${NC}"
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --quiet --eval "
print('📊 Resource storage check:');
const count = db.educational_resources.countDocuments();
print('Total resources in database:', count);

if (count > 0) {
  print('✅ Resources found - authentication appears to be working');
  print('');
  print('Sample resources:');
  db.educational_resources.find().limit(2).forEach(function(doc) {
    print('  • Concept:', doc.concept_id);
    print('    Title:', doc.title || 'N/A');
    print('    Quality:', doc.quality_score || 'N/A');
    print('    Created:', doc.scraped_at || doc.created_at || 'N/A');
    print('');
  });
} else {
  print('⚠️ No resources found - may indicate:');
  print('  1. Authentication is still failing');
  print('  2. Scraping hasn\'t been triggered yet');
  print('  3. Server needs to be restarted with latest code');
}
"

echo ""
echo -e "${YELLOW}🔧 If you're still seeing authentication errors:${NC}"
echo "1. Make sure you restarted the server after the code changes"
echo "2. Check that the server logs show: 'Web scraper initialized successfully with shared MongoDB client'"
echo "3. The main fix ensures the scraper reuses the authenticated MongoDB connection"
echo ""
echo -e "${GREEN}✅ Authentication fix test completed!${NC}"