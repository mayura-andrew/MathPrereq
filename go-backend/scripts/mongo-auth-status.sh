#!/bin/bash

echo "🔍 MongoDB Authentication Status Check"
echo "======================================"

# Check if MongoDB container is running
CONTAINER_ID=$(docker-compose ps -q mongodb)
if [ -z "$CONTAINER_ID" ]; then
    echo "❌ MongoDB container not running"
    echo "Run: make complete-mongo-fix"
    exit 1
fi

echo "✅ MongoDB container running: $CONTAINER_ID"

echo ""
echo "1. Testing MongoDB authentication:"

# Test all the operations that were failing in the Go app
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --eval "
try {
    print('=== MongoDB Authentication Test ===');
    
    const tests = [
        { name: 'Ping', test: () => db.runCommand({ping: 1}) },
        { name: 'Insert', test: () => db.test_auth.insertOne({test: 'auth_check'}) },
        { name: 'Find', test: () => db.test_auth.findOne({test: 'auth_check'}) },
        { name: 'Aggregate', test: () => db.test_auth.aggregate([{\$group: {_id: null, count: {\$sum: 1}}}]) },
        { name: 'Create Index', test: () => db.test_auth.createIndex({test: 1}) },
        { name: 'Bulk Write', test: () => db.test_auth.bulkWrite([{ insertOne: { document: {bulk: true} } }]) }
    ];
    
    let passed = 0;
    let failed = 0;
    
    tests.forEach(test => {
        try {
            const result = test.test();
            print('✅', test.name + ': SUCCESS');
            passed++;
        } catch (error) {
            print('❌', test.name + ': FAILED -', error.message);
            failed++;
        }
    });
    
    // Cleanup
    try {
        db.test_auth.drop();
        print('✅ Cleanup: SUCCESS');
    } catch (error) {
        print('⚠️  Cleanup: FAILED -', error.message);
    }
    
    print('');
    print('📊 Test Results:');
    print('   Passed:', passed);
    print('   Failed:', failed);
    print('   Total:', tests.length);
    
    if (failed === 0) {
        print('🎉 ALL TESTS PASSED! MongoDB authentication is working.');
        print('Your Go application should work without authentication errors.');
    } else {
        print('❌ Some tests failed. Run: make complete-mongo-fix');
    }
    
} catch (error) {
    print('❌ Test execution failed:', error.message);
}
" 2>/dev/null || echo "❌ Connection to MongoDB failed"

echo ""
echo "2. If all tests passed, your MongoDB authentication is working correctly."
echo "3. If any tests failed, run: make complete-mongo-fix"