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

# Test MongoDB setup and provide correct configuration
echo "🔍 Testing MongoDB Authentication Setup"
echo "======================================"

# Set environment variables for your app
export MONGODB_USERNAME="admin"
export MONGODB_PASSWORD="password123" 
export MONGODB_HOST="localhost"
export MONGODB_PORT="27017"
export MONGODB_DATABASE="mathprereq"
export MONGODB_AUTH_SOURCE="admin"

# Test if MongoDB container is running
echo "1. Checking if MongoDB is running..."
if docker ps | grep -q mathprereq-mongodb; then
    echo "✅ MongoDB container is running"
else
    echo "❌ MongoDB container is not running"
    echo "🚀 Starting MongoDB with authentication..."
    
    # Start MongoDB with authentication
    docker run -d \
        --name mathprereq-mongodb \
        -p 27017:27017 \
        -e MONGO_INITDB_ROOT_USERNAME=admin \
        -e MONGO_INITDB_ROOT_PASSWORD=password123 \
        -e MONGO_INITDB_DATABASE=mathprereq \
        mongo:latest
        
    echo "⏳ Waiting for MongoDB to start..."
    sleep 10
fi

# Test authentication
echo "2. Testing MongoDB authentication..."
mongo_test=$(docker exec mathprereq-mongodb mongosh --quiet --eval "
try {
    db.auth('admin', 'password123');
    db.getSiblingDB('mathprereq').test.insertOne({test: 'auth_test'});
    db.getSiblingDB('mathprereq').test.deleteOne({test: 'auth_test'});
    print('SUCCESS: Authentication and write operations work');
} catch(e) {
    print('ERROR: ' + e);
}
" 2>/dev/null)

echo "$mongo_test"

# Provide the correct connection string
echo ""
echo "🔧 Use these environment variables:"
echo "export MONGODB_USERNAME='admin'"
echo "export MONGODB_PASSWORD='password123'"
echo "export MONGODB_HOST='localhost'"
echo "export MONGODB_PORT='27017'" 
echo "export MONGODB_DATABASE='mathprereq'"
echo "export MONGODB_AUTH_SOURCE='admin'"
echo ""
echo "Or connection string: mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin"

# Test the Go application with correct env vars
echo ""
echo "3. Testing Go application with correct configuration..."
cd /home/andrew/dev/research/go-backend

# Build and test
go build ./cmd/server
if [ $? -eq 0 ]; then
    echo "✅ Go application builds successfully"
    
    # Test with environment variables
    echo "🚀 Starting application with correct MongoDB config..."
    MONGODB_USERNAME=admin MONGODB_PASSWORD=password123 MONGODB_HOST=localhost MONGODB_PORT=27017 MONGODB_DATABASE=mathprereq MONGODB_AUTH_SOURCE=admin timeout 10s ./server &
    
    sleep 5
    
    # Test health endpoint
    if curl -s "http://localhost:8080/health" | grep -q "healthy"; then
        echo "✅ Application started successfully with MongoDB authentication"
    else
        echo "❌ Application health check failed"
    fi
    
    # Stop the test server
    pkill -f "./server"
else
    echo "❌ Go application failed to build"
fi