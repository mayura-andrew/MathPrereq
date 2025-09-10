#!/bin/bash

echo "🔍 MongoDB Connection Analysis"
echo "=============================="

# Check if MongoDB container is running
echo "1. MongoDB Container Status:"
CONTAINER_STATUS=$(docker ps --filter "name=mongo" --format "{{.Names}} {{.Status}}" 2>/dev/null)
if [ -z "$CONTAINER_STATUS" ]; then
    echo "   ❌ No MongoDB containers running"
    echo "   Starting MongoDB container..."
    docker-compose up mongodb -d
    sleep 10
    CONTAINER_STATUS=$(docker ps --filter "name=mongo" --format "{{.Names}} {{.Status}}" 2>/dev/null)
fi

echo "   Container: $CONTAINER_STATUS"

echo ""

# Test different connection strings
echo "2. Connection String Tests:"

# Test 1: Direct localhost connection (what your Go app uses)
echo "   Test 1 - localhost:27017 (Go app connection):"
timeout 5s mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --eval "
print('✅ Connection result:');
try {
    const result = db.runCommand({ping: 1});
    print('Ping successful:', result.ok === 1);
    
    // Test write operation  
    const writeTest = db.educational_resources.insertOne({test: true, created: new Date()});
    print('Write test successful:', writeTest.insertedId ? 'Yes' : 'No');
    
    // Clean up
    db.educational_resources.deleteOne({_id: writeTest.insertedId});
    print('Authentication status: WORKING');
    
} catch (error) {
    print('❌ Error:', error.message);
    print('Authentication status: FAILED');
}
" 2>/dev/null || echo "   ❌ localhost connection failed"

echo ""

# Test 2: Container network connection
echo "   Test 2 - Container internal connection:"
MONGO_CONTAINER=$(docker-compose ps -q mongodb 2>/dev/null)
if [ -n "$MONGO_CONTAINER" ]; then
    docker exec "$MONGO_CONTAINER" mongosh --eval "
    print('✅ Container internal test:');
    try {
        const result = db.runCommand({ping: 1});
        print('Internal ping successful:', result.ok === 1);
    } catch (error) {
        print('❌ Internal error:', error.message);
    }
    " 2>/dev/null || echo "   ❌ Container internal test failed"
else
    echo "   ❌ MongoDB container not found"
fi

echo ""

# Check port mapping
echo "3. Port Mapping Check:"
PORT_MAP=$(docker port "$MONGO_CONTAINER" 27017 2>/dev/null || echo "Port mapping not found")
echo "   27017 mapping: $PORT_MAP"

echo ""

# Check what's listening on 27017
echo "4. Port 27017 Listeners:"
if command -v netstat &> /dev/null; then
    netstat -tlnp | grep :27017 | head -3
elif command -v lsof &> /dev/null; then
    lsof -i :27017 | head -3
else
    echo "   Cannot check (netstat/lsof not available)"
fi

echo ""
echo "=============================="
echo "📋 Diagnosis:"
echo "If Test 1 works: Authentication is fine"
echo "If Test 1 fails: MongoDB container port mapping issue"
echo "If both fail: MongoDB container is not running properly"