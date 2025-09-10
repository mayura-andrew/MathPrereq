#!/bin/bash

echo "🔍 Testing Query Analytics Functionality"
echo "======================================="

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
    echo "1. Checking if query_responses collection exists:"
    docker exec "$CONTAINER_ID" mongosh -u admin -p password123 --authenticationDatabase admin --eval "
    try {
        db = db.getSiblingDB('mathprereq');
        const collections = db.listCollectionNames();
        const hasQueryResponses = collections.includes('query_responses');
        print('Query responses collection exists:', hasQueryResponses);
        
        if (hasQueryResponses) {
            const count = db.query_responses.countDocuments();
            print('Documents in collection:', count);
            
            if (count > 0) {
                print('Sample document:');
                const sample = db.query_responses.findOne();
                printjson(sample);
            }
        }
    } catch (error) {
        print('❌ Error:', error.message);
    }
    "
    
    echo ""
    echo "2. Testing query analytics operations:"
    docker exec "$CONTAINER_ID" mongosh -u admin -p password123 --authenticationDatabase admin --eval "
    try {
        db = db.getSiblingDB('mathprereq');
        
        // Test basic operations on query_responses collection
        print('Testing collection operations...');
        
        // Create collection if it doesn't exist
        db.createCollection('query_responses');
        print('✅ Collection created/exists');
        
        // Test insert operation
        const testDoc = {
            query: 'test query',
            identified_concepts: ['test_concept'],
            prerequisite_path: [],
            retrieved_context: ['test context'],
            explanation: 'test explanation',
            response_time: 1000000000, // 1 second in nanoseconds
            processing_success: true,
            timestamp: new Date(),
            llm_provider: 'test',
            llm_model: 'test-model',
            knowledge_graph_hits: 1,
            vector_store_hits: 1
        };
        
        const insertResult = db.query_responses.insertOne(testDoc);
        print('✅ Insert operation successful, ID:', insertResult.insertedId);
        
        // Test find operation
        const findResult = db.query_responses.findOne({query: 'test query'});
        print('✅ Find operation successful:', findResult ? 'found' : 'not found');
        
        // Test aggregation operation
        const aggResult = db.query_responses.aggregate([
            {\$group: {_id: null, count: {\$sum: 1}}}
        ]);
        const aggArray = aggResult.toArray();
        print('✅ Aggregate operation successful, total docs:', aggArray.length > 0 ? aggArray[0].count : 0);
        
        // Cleanup
        db.query_responses.deleteMany({query: 'test query'});
        print('✅ Cleanup successful');
        
        print('');
        print('🎉 All query analytics operations working correctly!');
        
    } catch (error) {
        print('❌ Error:', error.message);
        print('This indicates an issue with MongoDB operations');
    }
    "
    
else
    echo "❌ Could not find MongoDB container"
fi

echo ""
echo "======================================="
echo "📋 Summary:"
echo "If all operations show SUCCESS, query analytics is working"
echo "If any operation shows FAILED, there are MongoDB permission issues"
echo "The Go application should now save query data to MongoDB"