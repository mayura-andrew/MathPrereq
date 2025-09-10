#!/bin/bash

echo "🔍 MongoDB Authentication Quick Fix"
echo "==================================="

# Check if MongoDB container is running
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
    
    echo ""
    echo "1. Checking current user permissions:"
    docker exec "$CONTAINER_ID" mongosh --eval "
    try {
        db = db.getSiblingDB('admin');
        const users = db.getUsers();
        if (users.users && users.users.length > 0) {
            print('Current users:');
            users.users.forEach(user => {
                print('  -', user.user, 'roles:', JSON.stringify(user.roles));
            });
        } else {
            print('No users found - creating admin user...');
            
            // Create admin user
            const createResult = db.createUser({
                user: 'admin',
                pwd: 'password123',
                roles: [
                    { role: 'userAdminAnyDatabase', db: 'admin' },
                    { role: 'readWriteAnyDatabase', db: 'admin' },
                    { role: 'dbAdminAnyDatabase', db: 'admin' }
                ]
            });
            print('✅ User created:', JSON.stringify(createResult));
        }
    } catch (error) {
        print('❌ Error:', error.message);
    }
    "
    
    echo ""
    echo "2. Granting permissions on mathprereq database:"
    docker exec "$CONTAINER_ID" mongosh -u admin -p password123 --authenticationDatabase admin --eval "
    try {
        db = db.getSiblingDB('mathprereq');
        
        // Grant permissions
        const grantResult = db.grantRolesToUser('admin', [
            { role: 'readWrite', db: 'mathprereq' },
            { role: 'dbAdmin', db: 'mathprereq' }
        ]);
        
        print('✅ Permissions granted:', JSON.stringify(grantResult));
        
        // Test permissions
        const testDoc = db.test_permissions.insertOne({test: 'quick_fix', time: new Date()});
        print('✅ Write test:', testDoc.insertedId ? 'SUCCESS' : 'FAILED');
        
        const testRead = db.test_permissions.findOne({test: 'quick_fix'});
        print('✅ Read test:', testRead ? 'SUCCESS' : 'FAILED');
        
        const testAgg = db.test_permissions.aggregate([{\$group: {_id: null, count: {\$sum: 1}}}]);
        print('✅ Aggregate test: SUCCESS');
        
        // Cleanup
        db.test_permissions.drop();
        print('✅ Cleanup: SUCCESS');
        
    } catch (error) {
        print('❌ Permission test failed:', error.message);
    }
    "
    
    echo ""
    echo "3. Final authentication test:"
    mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --eval "
    try {
        const ping = db.runCommand({ping: 1});
        print('✅ Ping:', ping.ok === 1 ? 'SUCCESS' : 'FAILED');
        
        const write = db.final_test.insertOne({test: 'final', time: new Date()});
        print('✅ Write:', write.insertedId ? 'SUCCESS' : 'FAILED');
        
        const read = db.final_test.findOne({test: 'final'});
        print('✅ Read:', read ? 'SUCCESS' : 'FAILED');
        
        const agg = db.final_test.aggregate([{\$group: {_id: null, count: {\$sum: 1}}}]);
        print('✅ Aggregate: SUCCESS');
        
        db.final_test.drop();
        print('✅ Cleanup: SUCCESS');
        
        print('');
        print('🎉 MongoDB authentication is now working!');
        print('Your Go application should work without authentication errors.');
        
    } catch (error) {
        print('❌ Final test failed:', error.message);
        print('Try: make complete-mongo-fix');
    }
    " 2>/dev/null || echo "❌ External connection failed"
    
else
    echo "❌ Could not start MongoDB container"
fi

echo ""
echo "==================================="
echo "📋 If all tests show SUCCESS, run your Go application now"
echo "📋 If any test shows FAILED, try: make complete-mongo-fix"