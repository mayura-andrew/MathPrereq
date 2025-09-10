#!/bin/bash

echo "🔍 MongoDB Authentication Fix"
echo "============================="

# Check MongoDB container
echo "1. Checking MongoDB container..."
CONTAINER_ID=$(docker-compose ps -q mongodb)
if [ -z "$CONTAINER_ID" ]; then
    echo "❌ MongoDB container not running"
    echo "Starting MongoDB..."
    docker-compose up mongodb -d
    sleep 15
    CONTAINER_ID=$(docker-compose ps -q mongodb)
fi

if [ -n "$CONTAINER_ID" ]; then
    echo "✅ MongoDB container running: $CONTAINER_ID"
    
    # Check MongoDB logs for auth issues
    echo ""
    echo "2. MongoDB logs (last 20 lines):"
    docker-compose logs mongodb --tail=20
    
    echo ""
    echo "3. Testing MongoDB authentication:"
    docker exec "$CONTAINER_ID" mongosh --eval "
    try {
        // Switch to admin database for auth check
        db = db.getSiblingDB('admin');
        
        // Check if user exists
        const users = db.getUsers();
        print('Users in admin database:', users.users ? users.users.length : 0);
        
        if (users.users && users.users.length > 0) {
            print('User details:');
            users.users.forEach(user => {
                print('  -', user.user, 'roles:', JSON.stringify(user.roles));
            });
        }
        
        // Test authentication
        db = db.getSiblingDB('mathprereq');
        const ping = db.runCommand({ping: 1});
        print('Database ping successful:', ping.ok === 1);
        
    } catch (error) {
        print('❌ MongoDB error:', error.message);
    }
    "
else
    echo "❌ Could not find MongoDB container"
fi

echo ""
echo "4. Testing external connection:"
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --eval "
try {
    const ping = db.runCommand({ping: 1});
    print('✅ External ping successful:', ping.ok === 1);
    
    // Test write operation
    const testDoc = {test: 'auth_fix', timestamp: new Date()};
    const insert = db.test_auth.insertOne(testDoc);
    print('✅ Write successful, ID:', insert.insertedId);
    
    // Test read operation  
    const count = db.test_auth.countDocuments({test: 'auth_fix'});
    print('✅ Read successful, count:', count);
    
    // Test aggregate operation (this is failing in Go)
    const agg = db.test_auth.aggregate([{\$group: {_id: null, total: {\$sum: 1}}}]);
    const aggResult = agg.toArray();
    print('✅ Aggregate successful, total:', aggResult.length > 0 ? aggResult[0].total : 0);
    
    // Cleanup
    db.test_auth.drop();
    print('✅ Cleanup successful');
    
} catch (error) {
    print('❌ External test failed:', error.message);
}
" 2>/dev/null || echo "❌ External connection failed"

echo ""
echo "=============================="
echo "📋 If external tests work but Go app fails:"
echo "   - Issue is in Go MongoDB client usage"
echo "   - Check if the client is properly authenticated"
echo "📋 If external tests fail:"
echo "   - Issue is MongoDB authentication setup"
echo "   - Check MongoDB user creation and permissions"