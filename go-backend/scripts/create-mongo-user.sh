#!/bin/bash

echo "🔍 MongoDB User Creation and Permissions Fix"
echo "==========================================="

# Check if MongoDB container is running
CONTAINER_ID=$(docker-compose ps -q mongodb)
if [ -z "$CONTAINER_ID" ]; then
    echo "❌ MongoDB container not running"
    exit 1
fi

echo "✅ MongoDB container running: $CONTAINER_ID"

echo ""
echo "1. Creating user with proper permissions:"

# Create user with readWrite role on mathprereq database
docker exec "$CONTAINER_ID" mongosh --eval "
try {
    // Switch to admin database
    db = db.getSiblingDB('admin');
    
    // Create user with proper permissions
    const userResult = db.createUser({
        user: 'admin',
        pwd: 'password123',
        roles: [
            {
                role: 'userAdminAnyDatabase',
                db: 'admin'
            },
            {
                role: 'readWriteAnyDatabase',
                db: 'admin'
            },
            {
                role: 'dbAdminAnyDatabase',
                db: 'admin'
            }
        ]
    });
    
    print('✅ User creation result:', JSON.stringify(userResult));
    
    // Switch to mathprereq database and grant permissions
    db = db.getSiblingDB('mathprereq');
    
    // Grant readWrite role on mathprereq database
    const grantResult = db.grantRolesToUser('admin', [
        { role: 'readWrite', db: 'mathprereq' },
        { role: 'dbAdmin', db: 'mathprereq' }
    ]);
    
    print('✅ Permission grant result:', JSON.stringify(grantResult));
    
    // Test the permissions
    const testDoc = db.test_permissions.insertOne({test: 'user_creation', time: new Date()});
    print('✅ Permission test - write:', testDoc.insertedId ? 'SUCCESS' : 'FAILED');
    
    const testRead = db.test_permissions.findOne({test: 'user_creation'});
    print('✅ Permission test - read:', testRead ? 'SUCCESS' : 'FAILED');
    
    // Cleanup
    db.test_permissions.drop();
    print('✅ Permission test - cleanup: SUCCESS');
    
} catch (error) {
    print('❌ Error:', error.message);
}
"

echo ""
echo "2. Verifying user permissions:"
docker exec "$CONTAINER_ID" mongosh -u admin -p password123 --authenticationDatabase admin --eval "
try {
    print('=== Verifying User Permissions ===');
    
    // Check user roles
    db = db.getSiblingDB('admin');
    const userInfo = db.getUser('admin');
    print('User roles:', JSON.stringify(userInfo.roles));
    
    // Test operations on mathprereq database
    db = db.getSiblingDB('mathprereq');
    
    // Test all operations that were failing
    const operations = [
        { name: 'ping', op: () => db.runCommand({ping: 1}) },
        { name: 'insert', op: () => db.test_verify.insertOne({verify: true}) },
        { name: 'find', op: () => db.test_verify.findOne({verify: true}) },
        { name: 'aggregate', op: () => db.test_verify.aggregate([{\$group: {_id: null, count: {\$sum: 1}}}]) },
        { name: 'createIndex', op: () => db.test_verify.createIndex({verify: 1}) },
        { name: 'bulkWrite', op: () => db.test_verify.bulkWrite([{ insertOne: { document: {bulk_test: true} } }]) }
    ];
    
    operations.forEach(op => {
        try {
            const result = op.op();
            print('✅', op.name + ':', 'SUCCESS');
        } catch (error) {
            print('❌', op.name + ':', error.message);
        }
    });
    
    // Cleanup
    db.test_verify.drop();
    print('✅ Cleanup: SUCCESS');
    
} catch (error) {
    print('❌ Verification failed:', error.message);
}
"

echo ""
echo "==========================================="
echo "📋 If all operations show SUCCESS, user permissions are fixed"
echo "📋 If any operation shows FAILED, there are still permission issues"
echo "📋 After fixing permissions, restart your Go application"