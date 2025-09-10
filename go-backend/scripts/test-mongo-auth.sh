#!/bin/bash

echo "🔍 MongoDB Authentication Test"
echo "=============================="

# Test direct MongoDB connection with authentication
echo "1. Testing MongoDB authentication directly:"
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --eval "
print('=== Direct MongoDB Test ===');
try {
    // Test basic connection
    const pingResult = db.runCommand({ping: 1});
    print('✅ Ping successful:', pingResult.ok === 1);
    
    // Test authentication by trying to access the database
    const dbStats = db.stats();
    print('✅ Database access successful');
    print('Database name:', db.getName());
    
    // Test write operation
    const testDoc = {test: true, timestamp: new Date(), auth_test: 'direct_connection'};
    const insertResult = db.educational_resources.insertOne(testDoc);
    print('✅ Write operation successful, inserted ID:', insertResult.insertedId);
    
    // Test read operation
    const count = db.educational_resources.countDocuments({test: true});
    print('✅ Read operation successful, test docs found:', count);
    
    // Test aggregation (this is failing in the scraper)
    const aggResult = db.educational_resources.aggregate([{\$group: {_id: null, count: {\$sum: 1}}}]);
    const aggArray = aggResult.toArray();
    print('✅ Aggregation successful, total docs:', aggArray.length > 0 ? aggArray[0].count : 0);
    
    // Clean up
    db.educational_resources.deleteMany({test: true});
    print('✅ Cleanup successful');
    
    print('🎉 All MongoDB operations successful - authentication is working!');
    
} catch (error) {
    print('❌ MongoDB operation failed:', error.message);
    print('This indicates an authentication problem');
}
" 2>/dev/null || echo "❌ Connection test failed"

echo ""
echo "2. Checking MongoDB container status:"
docker-compose ps mongodb

echo ""
echo "3. Checking MongoDB logs for authentication issues:"
docker-compose logs mongodb --tail=20 | grep -i auth || echo "No authentication-related logs found"

echo ""
echo "=============================="
echo "📋 Analysis:"
echo "If the direct test works but the Go app fails, the issue is in the Go MongoDB client usage."
echo "If the direct test fails, there's a MongoDB authentication configuration problem."