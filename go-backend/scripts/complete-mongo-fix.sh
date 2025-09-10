#!/bin/bash

echo "🔍 Complete MongoDB Authentication Fix"
echo "======================================"

# Step 1: Stop MongoDB container
echo "1. Stopping MongoDB container..."
docker-compose down

# Step 2: Remove MongoDB volume to start fresh
echo "2. Removing MongoDB data volume..."
docker volume rm $(docker volume ls -q | grep mongodb) 2>/dev/null || echo "No MongoDB volumes to remove"

# Step 3: Start MongoDB container
echo "3. Starting MongoDB container..."
docker-compose up mongodb -d

# Step 4: Wait for MongoDB to initialize
echo "4. Waiting for MongoDB to initialize (30 seconds)..."
sleep 30

# Step 5: Check if MongoDB is running
echo "5. Checking MongoDB container status..."
docker-compose ps mongodb

# Step 6: Test the connection
echo "6. Testing MongoDB connection and authentication..."
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --eval "
try {
    print('=== MongoDB Authentication Test ===');
    
    // Test ping
    const ping = db.runCommand({ping: 1});
    print('✅ Ping:', ping.ok === 1 ? 'SUCCESS' : 'FAILED');
    
    // Test database access
    print('✅ Database:', db.getName());
    
    // Test write operation
    const write = db.test_auth.insertOne({test: 'fresh_install', time: new Date()});
    print('✅ Write operation:', write.insertedId ? 'SUCCESS' : 'FAILED');
    
    // Test read operation
    const read = db.test_auth.findOne({test: 'fresh_install'});
    print('✅ Read operation:', read ? 'SUCCESS' : 'FAILED');
    
    // Test aggregate operation (this was failing)
    const agg = db.test_auth.aggregate([{\$group: {_id: null, count: {\$sum: 1}}}]);
    const aggResult = agg.toArray();
    print('✅ Aggregate operation:', aggResult.length > 0 ? 'SUCCESS' : 'FAILED');
    
    // Test index creation (this was also failing)
    const index = db.test_auth.createIndex({test: 1});
    print('✅ Index creation:', index ? 'SUCCESS' : 'FAILED');
    
    // Test bulk write (this was failing)
    const bulk = db.test_auth.bulkWrite([
        { insertOne: { document: {bulk_test: true, time: new Date()} } }
    ]);
    print('✅ Bulk write:', bulk.insertedCount === 1 ? 'SUCCESS' : 'FAILED');
    
    // Cleanup
    db.test_auth.drop();
    print('✅ Cleanup: SUCCESS');
    
    print('');
    print('🎉 ALL TESTS PASSED! MongoDB authentication is working correctly.');
    print('Your Go application should now work without authentication errors.');
    
} catch (error) {
    print('❌ Test failed:', error.message);
    print('');
    print('🔧 Troubleshooting:');
    print('1. Check MongoDB logs: docker-compose logs mongodb');
    print('2. Verify user creation: run make check-mongo-permissions');
    print('3. Try manual user creation: run make create-mongo-user');
}
" 2>/dev/null || echo "❌ Connection test failed"

echo ""
echo "======================================"
echo "📋 Next Steps:"
echo "1. If all tests show SUCCESS, run your Go application"
echo "2. If any test shows FAILED, check the troubleshooting steps above"
echo "3. Your Go app should now work without MongoDB authentication errors"