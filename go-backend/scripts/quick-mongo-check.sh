#!/bin/bash

echo "🔍 Quick MongoDB Authentication Check"
echo "====================================="

# Test if MongoDB container is running
echo "1. MongoDB Container Status:"
CONTAINER_STATUS=$(docker-compose ps mongodb --format "{{.Names}} {{.Status}}" 2>/dev/null)
if [ -z "$CONTAINER_STATUS" ]; then
    echo "❌ MongoDB container not running"
    echo "Starting MongoDB..."
    docker-compose up mongodb -d
    sleep 10
else
    echo "✅ MongoDB container: $CONTAINER_STATUS"
fi

echo ""

# Quick authentication test
echo "2. Authentication Test:"
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --eval "
try {
    const ping = db.runCommand({ping: 1});
    print('✅ Ping:', ping.ok === 1 ? 'SUCCESS' : 'FAILED');
    
    const write = db.test_collection.insertOne({test: true, time: new Date()});
    print('✅ Write:', write.insertedId ? 'SUCCESS' : 'FAILED');
    
    const read = db.test_collection.findOne({test: true});
    print('✅ Read:', read ? 'SUCCESS' : 'FAILED');
    
    const agg = db.test_collection.aggregate([{\$group: {_id: null, count: {\$sum: 1}}}]);
    print('✅ Aggregate:', 'SUCCESS');
    
    // Cleanup
    db.test_collection.drop();
    print('✅ Cleanup: SUCCESS');
    
} catch (error) {
    print('❌ Error:', error.message);
}
" 2>/dev/null || echo "❌ Connection failed"

echo ""
echo "3. If all tests above show SUCCESS, the issue is in the Go application."
echo "4. If any test shows FAILED, the issue is with MongoDB authentication."