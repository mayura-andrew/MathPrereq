#!/bin/bash

echo "🔍 MongoDB User and Permissions Check"
echo "===================================="

# Check if MongoDB container is running
CONTAINER_ID=$(docker-compose ps -q mongodb)
if [ -z "$CONTAINER_ID" ]; then
    echo "❌ MongoDB container not running"
    exit 1
fi

echo "✅ MongoDB container running: $CONTAINER_ID"

echo ""
echo "1. Checking MongoDB users and roles:"
docker exec "$CONTAINER_ID" mongosh --eval "
try {
    // Check admin database users
    db = db.getSiblingDB('admin');
    const adminUsers = db.getUsers();
    print('=== Admin Database Users ===');
    if (adminUsers.users && adminUsers.users.length > 0) {
        adminUsers.users.forEach(user => {
            print('User:', user.user);
            print('Roles:', JSON.stringify(user.roles, null, 2));
            print('---');
        });
    } else {
        print('No users found in admin database');
    }
    
    // Check mathprereq database users
    db = db.getSiblingDB('mathprereq');
    const dbUsers = db.getUsers();
    print('=== MathPrereq Database Users ===');
    if (dbUsers.users && dbUsers.users.length > 0) {
        dbUsers.users.forEach(user => {
            print('User:', user.user);
            print('Roles:', JSON.stringify(user.roles, null, 2));
            print('---');
        });
    } else {
        print('No users found in mathprereq database');
    }
    
} catch (error) {
    print('❌ Error checking users:', error.message);
}
"

echo ""
echo "2. Testing user permissions:"
docker exec "$CONTAINER_ID" mongosh -u admin -p password123 --authenticationDatabase admin --eval "
try {
    print('=== Testing User Permissions ===');
    
    // Switch to mathprereq database
    db = db.getSiblingDB('mathprereq');
    
    // Test basic operations
    const ping = db.runCommand({ping: 1});
    print('✅ Ping:', ping.ok === 1 ? 'SUCCESS' : 'FAILED');
    
    // Test collection creation
    const createResult = db.createCollection('test_permissions');
    print('✅ Create collection:', createResult.ok === 1 ? 'SUCCESS' : 'FAILED');
    
    // Test write operation
    const writeResult = db.test_permissions.insertOne({test: 'permissions', time: new Date()});
    print('✅ Write operation:', writeResult.insertedId ? 'SUCCESS' : 'FAILED');
    
    // Test read operation
    const readResult = db.test_permissions.findOne({test: 'permissions'});
    print('✅ Read operation:', readResult ? 'SUCCESS' : 'FAILED');
    
    // Test aggregate operation (this is failing in Go)
    const aggResult = db.test_permissions.aggregate([{\$group: {_id: null, count: {\$sum: 1}}}]);
    const aggArray = aggResult.toArray();
    print('✅ Aggregate operation:', aggArray.length > 0 ? 'SUCCESS' : 'FAILED');
    
    // Test index creation
    const indexResult = db.test_permissions.createIndex({test: 1});
    print('✅ Index creation:', indexResult ? 'SUCCESS' : 'FAILED');
    
    // Cleanup
    db.test_permissions.drop();
    print('✅ Cleanup: SUCCESS');
    
    print('🎉 All permission tests passed!');
    
} catch (error) {
    print('❌ Permission test failed:', error.message);
    print('This indicates insufficient user permissions');
}
"

echo ""
echo "3. If permission tests fail, we need to fix user roles."
echo "4. If permission tests pass but Go app fails, issue is in Go client."