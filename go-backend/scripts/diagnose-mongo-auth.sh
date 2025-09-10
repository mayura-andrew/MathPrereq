#!/bin/bash

echo "🔍 MongoDB Authentication Diagnosis"
echo "==================================="

# Check MongoDB container status
echo "1. MongoDB Container Status:"
CONTAINER_STATUS=$(docker-compose ps mongodb --format "{{.Names}} {{.Status}}")
if [ -z "$CONTAINER_STATUS" ]; then
    echo "❌ MongoDB container not running"
    echo "Starting MongoDB..."
    docker-compose up mongodb -d
    sleep 10
    CONTAINER_STATUS=$(docker-compose ps mongodb --format "{{.Names}} {{.Status}}")
fi

echo "Status: $CONTAINER_STATUS"

echo ""
echo "2. MongoDB Logs (last 15 lines):"
docker-compose logs mongodb --tail=15

echo ""
echo "3. Authentication Test:"
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --eval "
try {
    print('=== Authentication Test ===');
    
    // Test ping
    const ping = db.runCommand({ping: 1});
    print('✅ Ping:', ping.ok === 1 ? 'SUCCESS' : 'FAILED');
    
    // Test write
    const write = db.diag_test.insertOne({test: 'diagnosis', time: new Date()});
    print('✅ Write:', write.insertedId ? 'SUCCESS' : 'FAILED');
    
    // Test read
    const read = db.diag_test.findOne({test: 'diagnosis'});
    print('✅ Read:', read ? 'SUCCESS' : 'FAILED');
    
    // Test aggregate (this was failing)
    const agg = db.diag_test.aggregate([{\$group: {_id: null, count: {\$sum: 1}}}]);
    print('✅ Aggregate: SUCCESS');
    
    // Test index creation (this was failing)
    const index = db.diag_test.createIndex({test: 1});
    print('✅ Index Creation: SUCCESS');
    
    // Cleanup
    db.diag_test.drop();
    print('✅ Cleanup: SUCCESS');
    
    print('');
    print('🎉 MongoDB authentication is working correctly!');
    
} catch (error) {
    print('❌ Test failed:', error.message);
    print('');
    print('🔧 Possible fixes:');
    print('1. make quick-mongo-fix');
    print('2. make complete-mongo-fix');
    print('3. Check MongoDB user permissions');
}
" 2>/dev/null || echo "❌ Connection failed - MongoDB may not be accessible"

echo ""
echo "4. Network Check:"
echo "MongoDB port 27017 status:"
netstat -tlnp 2>/dev/null | grep :27017 || echo "Port 27017 not listening"

echo ""
echo "==================================="
echo "📋 Diagnosis Summary:"
echo "If all tests show SUCCESS: MongoDB authentication is working"
echo "If any test shows FAILED: Run the suggested fixes above"
echo "If connection fails: MongoDB container may not be running properly"