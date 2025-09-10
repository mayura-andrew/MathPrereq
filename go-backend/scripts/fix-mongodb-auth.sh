#!/bin/bash

echo "🚀 Quick Fix for Learning Resources Authentication"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Restarting MongoDB with proper authentication...${NC}"

# Stop and restart MongoDB with correct settings
docker-compose down mongodb
sleep 2
docker-compose up -d mongodb

echo -e "${YELLOW}Waiting for MongoDB to be ready...${NC}"
sleep 10

# Test MongoDB authentication
echo -e "${BLUE}Testing MongoDB authentication...${NC}"
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --quiet --eval "
print('✅ MongoDB authentication successful');
print('Database:', db.getName());

// Ensure the collection exists with proper permissions
db.createCollection('educational_resources');
print('✅ Educational resources collection ready');

// Test write permission
try {
  const testResult = db.educational_resources.insertOne({
    test: true,
    concept_id: 'test',
    created_at: new Date()
  });
  print('✅ Write permission confirmed');
  
  // Clean up
  db.educational_resources.deleteOne({_id: testResult.insertedId});
  print('✅ Test document cleaned up');
} catch (e) {
  print('❌ Write permission failed:', e.message);
}
"

echo ""
echo -e "${GREEN}MongoDB is ready. You can now:${NC}"
echo "1. Restart your server: go run ./cmd/server"
echo "2. Test the endpoints: make debug-learning"
echo "3. Try the learning resources API again"

echo ""
echo -e "${YELLOW}If you're still getting auth errors, check:${NC}"
echo "• Make sure MONGODB_URI environment variable is set correctly"
echo "• Verify the server is using the same connection string"
echo "• Check server logs for detailed error messages"