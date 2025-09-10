#!/bin/bash

echo "🔍 Query Analytics Data Explorer"
echo "================================"

# Check if MongoDB container is running
CONTAINER_ID=$(docker-compose ps -q mongodb)
if [ -z "$CONTAINER_ID" ]; then
    echo "❌ MongoDB container not running"
    exit 1
fi

echo "✅ MongoDB container running: $CONTAINER_ID"

echo ""
echo "1. Collection Overview:"
docker exec "$CONTAINER_ID" mongosh -u admin -p password123 --authenticationDatabase admin --eval "
try {
    db = db.getSiblingDB('mathprereq');
    
    // Check if collection exists
    const collections = db.listCollectionNames();
    if (!collections.includes('query_responses')) {
        print('❌ query_responses collection does not exist yet');
        print('Make some queries first to populate the data');
        quit();
    }
    
    const count = db.query_responses.countDocuments();
    print('📊 Total stored queries:', count);
    
    if (count === 0) {
        print('No queries stored yet. Make some API calls first.');
        quit();
    }
    
    // Get collection stats
    const stats = db.query_responses.stats();
    print('Collection size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
    print('Index size:', (stats.totalIndexSize / 1024 / 1024).toFixed(2), 'MB');
    
} catch (error) {
    print('❌ Error:', error.message);
}
"

echo ""
echo "2. Recent Queries (last 5):"
docker exec "$CONTAINER_ID" mongosh -u admin -p password123 --authenticationDatabase admin --eval "
try {
    db = db.getSiblingDB('mathprereq');
    
    const recent = db.query_responses.find()
        .sort({timestamp: -1})
        .limit(5)
        .toArray();
    
    recent.forEach((query, index) => {
        print(\`\${index + 1}. [\${query.timestamp.toISOString()}] \${query.query.substring(0, 80)}\${query.query.length > 80 ? '...' : ''}\`);
        print(\`   Status: \${query.processing_success ? '✅ SUCCESS' : '❌ FAILED'}\`);
        print(\`   Response time: \${(query.response_time / 1000000).toFixed(0)}ms\`);
        print(\`   Concepts: [\${query.identified_concepts.join(', ')}]\`);
        print('');
    });
    
} catch (error) {
    print('❌ Error retrieving recent queries:', error.message);
}
"

echo ""
echo "3. Query Statistics:"
docker exec "$CONTAINER_ID" mongosh -u admin -p password123 --authenticationDatabase admin --eval "
try {
    db = db.getSiblingDB('mathprereq');
    
    const stats = db.query_responses.aggregate([
        {
            \$group: {
                _id: null,
                total_queries: { \$sum: 1 },
                successful_queries: { \$sum: { \$cond: [{ \$eq: ['\$processing_success', true] }, 1, 0] } },
                failed_queries: { \$sum: { \$cond: [{ \$eq: ['\$processing_success', false] }, 1, 0] } },
                avg_response_time: { \$avg: '\$response_time' },
                total_concepts: { \$sum: { \$size: '\$identified_concepts' } }
            }
        }
    ]).toArray();
    
    if (stats.length > 0) {
        const s = stats[0];
        print('📈 Overall Statistics:');
        print('   Total queries:', s.total_queries);
        print('   Successful:', s.successful_queries, \`(\${((s.successful_queries / s.total_queries) * 100).toFixed(1)}%)\`);
        print('   Failed:', s.failed_queries, \`(\${((s.failed_queries / s.total_queries) * 100).toFixed(1)}%)\`);
        print('   Average response time:', (s.avg_response_time / 1000000).toFixed(0), 'ms');
        print('   Total concepts identified:', s.total_concepts);
        print('   Average concepts per query:', (s.total_concepts / s.total_queries).toFixed(1));
    }
    
} catch (error) {
    print('❌ Error calculating statistics:', error.message);
}
"

echo ""
echo "4. Popular Concepts:"
docker exec "$CONTAINER_ID" mongosh -u admin -p password123 --authenticationDatabase admin --eval "
try {
    db = db.getSiblingDB('mathprereq');
    
    const popular = db.query_responses.aggregate([
        { \$unwind: '\$identified_concepts' },
        { \$group: { _id: '\$identified_concepts', count: { \$sum: 1 } } },
        { \$sort: { count: -1 } },
        { \$limit: 10 }
    ]).toArray();
    
    print('🔥 Most Popular Concepts:');
    popular.forEach((concept, index) => {
        print(\`   \${index + 1}. \${concept._id} (\${concept.count} queries)\`);
    });
    
} catch (error) {
    print('❌ Error getting popular concepts:', error.message);
}
"

echo ""
echo "5. Failed Queries (if any):"
docker exec "$CONTAINER_ID" mongosh -u admin -p password123 --authenticationDatabase admin --eval "
try {
    db = db.getSiblingDB('mathprereq');
    
    const failed = db.query_responses.find(
        { processing_success: false },
        { query: 1, error_message: 1, timestamp: 1 }
    ).sort({timestamp: -1}).limit(3).toArray();
    
    if (failed.length > 0) {
        print('⚠️  Recent Failed Queries:');
        failed.forEach((query, index) => {
            print(\`   \${index + 1}. [\${query.timestamp.toISOString()}] \${query.query.substring(0, 60)}\${query.query.length > 60 ? '...' : ''}\`);
            if (query.error_message) {
                print(\`      Error: \${query.error_message.substring(0, 100)}\${query.error_message.length > 100 ? '...' : ''}\`);
            }
            print('');
        });
    } else {
        print('✅ No failed queries found');
    }
    
} catch (error) {
    print('❌ Error retrieving failed queries:', error.message);
}
"

echo ""
echo "================================"
echo "💡 Tips:"
echo "• Run this script after making API calls to see stored data"
echo "• Use 'make test-query-analytics' to verify functionality"
echo "• Check /api/v1/analytics/queries endpoint for programmatic access"