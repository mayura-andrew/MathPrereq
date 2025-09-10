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

echo ""
echo "🧪 Testing MongoDB Authentication Fix"
echo "===================================="

BASE_URL="http://localhost:8080"

# Test 1: Check health endpoint
echo "1. Testing application health..."
HEALTH_RESPONSE=$(curl -s "${BASE_URL}/health")
echo "Health: $HEALTH_RESPONSE" | jq -r '.status // "ERROR"'

# Test 2: Test MongoDB connection directly
echo -e "\n2. Testing MongoDB connection directly..."
docker exec mathprereq-mongodb mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --eval "
try {
    // Test basic operations
    db.educational_resources.insertOne({test: 'connection_test', timestamp: new Date()});
    print('✅ Write test successful');
    
    var count = db.educational_resources.countDocuments({});
    print('✅ Read test successful - documents:', count);
    
    db.educational_resources.deleteOne({test: 'connection_test'});
    print('✅ Delete test successful');
    
    // Test query_responses collection
    db.query_responses.insertOne({test: 'query_analytics_test', timestamp: new Date()});
    print('✅ Query analytics write test successful');
    
    var queryCount = db.query_responses.countDocuments({});
    print('✅ Query analytics read test successful - documents:', queryCount);
    
    db.query_responses.deleteOne({test: 'query_analytics_test'});
    print('✅ Query analytics cleanup successful');
    
} catch (error) {
    print('❌ MongoDB test failed:', error);
}
"

# Test 3: Test resources API endpoint
echo -e "\n3. Testing resources API endpoint..."
RESOURCES_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${BASE_URL}/api/v1/resources/concept/derivatives?limit=5")
HTTP_CODE=$(echo "$RESOURCES_RESPONSE" | tail -n1 | cut -d: -f2)
RESPONSE_BODY=$(echo "$RESOURCES_RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
if [[ "$HTTP_CODE" == "200" ]]; then
    echo "✅ Resources endpoint working"
    SUCCESS=$(echo "$RESPONSE_BODY" | jq -r '.success // false')
    if [[ "$SUCCESS" == "true" ]]; then
        echo "✅ Resources response successful"
    else
        echo "❌ Resources response indicates failure"
        echo "$RESPONSE_BODY" | jq '.message // "No message"'
    fi
else
    echo "❌ Resources endpoint failed with HTTP $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Test 4: Test resource statistics
echo -e "\n4. Testing resource statistics..."
STATS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${BASE_URL}/api/v1/resources/stats")
STATS_HTTP_CODE=$(echo "$STATS_RESPONSE" | tail -n1 | cut -d: -f2)
STATS_BODY=$(echo "$STATS_RESPONSE" | sed '$d')

echo "HTTP Status: $STATS_HTTP_CODE"
if [[ "$STATS_HTTP_CODE" == "200" ]]; then
    echo "✅ Resource stats endpoint working"
    STATS_SUCCESS=$(echo "$STATS_BODY" | jq -r '.success // false')
    if [[ "$STATS_SUCCESS" == "true" ]]; then
        echo "✅ Resource stats successful"
        echo "$STATS_BODY" | jq '.stats // "No stats"'
    else
        echo "❌ Resource stats response indicates failure"
    fi
else
    echo "❌ Resource stats endpoint failed"
fi

# Test 5: Test triggering resource finding
echo -e "\n5. Testing resource finding trigger..."
FIND_RESPONSE=$(curl -s -X POST -w "\nHTTP_CODE:%{http_code}" "${BASE_URL}/api/v1/resources/find/integrals")