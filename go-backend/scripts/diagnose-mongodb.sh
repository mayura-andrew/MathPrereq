#!/bin/bash

echo "🔍 MongoDB Diagnosis and Fix"

# Check if Docker is running
echo "1. Checking Docker status..."
if ! docker ps >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
else
    echo "✅ Docker is running"
fi

# Check MongoDB container status
echo ""
echo "2. Checking MongoDB container..."
MONGO_STATUS=$(docker-compose ps mongodb --format json 2>/dev/null | jq -r '.[0].State // "not found"' 2>/dev/null || echo "not found")

if [ "$MONGO_STATUS" = "not found" ] || [ "$MONGO_STATUS" = "null" ]; then
    echo "❌ MongoDB container not found"
    echo "Starting MongoDB container..."
    docker-compose up mongodb -d
    echo "Waiting 15 seconds for MongoDB to initialize..."
    sleep 15
else
    echo "Container status: $MONGO_STATUS"
    if [ "$MONGO_STATUS" != "running" ]; then
        echo "MongoDB container exists but not running. Starting..."
        docker-compose up mongodb -d
        echo "Waiting 15 seconds for MongoDB to start..."
        sleep 15
    fi
fi

# Check container logs if still having issues
echo ""
echo "3. Checking MongoDB container logs (last 10 lines)..."
docker-compose logs --tail=10 mongodb

# Test direct connection
echo ""
echo "4. Testing MongoDB connection..."
timeout 10s mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --eval "
print('✅ Connection test result:');
try {
    const result = db.runCommand({ping: 1});
    print('Ping successful:', result.ok === 1);
    print('Database:', db.getName());
} catch (error) {
    print('❌ Connection failed:', error.message);
}
" 2>/dev/null || echo "❌ Connection test failed or timed out"

echo ""
echo "5. Network check..."
echo "MongoDB container port mapping:"
docker-compose port mongodb 27017 2>/dev/null || echo "Port mapping not found"

echo ""
echo "Container network details:"
docker inspect $(docker-compose ps -q mongodb 2>/dev/null) --format='{{range .NetworkSettings.Networks}}IP: {{.IPAddress}} {{end}}' 2>/dev/null || echo "Container not found"

echo ""
echo "🔧 If MongoDB is still not accessible:"
echo "1. docker-compose down"
echo "2. docker-compose up mongodb -d"
echo "3. Wait 20 seconds and try again"