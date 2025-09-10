#!/bin/bash

echo "🧪 Testing Learning Resources with Direct Concept Names"

# Step 1: Get a concept name from Neo4j
echo "📋 Getting concept names from Neo4j..."
CONCEPT_NAME=$(curl -s http://localhost:8000/api/v1/concepts | jq -r '.[0].name')
echo "Using concept: $CONCEPT_NAME"

# Step 2: Check if we have resources for this exact concept name in MongoDB
echo ""
echo "🔍 Checking MongoDB for exact concept name match..."
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --quiet --eval "
var conceptName = '$CONCEPT_NAME';
print('Looking for concept_name:', conceptName);
var count1 = db.educational_resources.countDocuments({concept_name: conceptName});
print('Found by concept_name:', count1);

var count2 = db.educational_resources.countDocuments({concept_id: conceptName});
print('Found by concept_id:', count2);

var lowerName = conceptName.toLowerCase();
var count3 = db.educational_resources.countDocuments({concept_id: lowerName});
print('Found by lowercase concept_id:', count3);

if (count1 > 0 || count2 > 0 || count3 > 0) {
    print('✅ Resources found!');
} else {
    print('❌ No resources found. Let\\'s scrape...');
}
"

# Step 3: If no resources, trigger scraping
echo ""
echo "🕷️ Triggering resource scraping for this concept..."
curl -s -X POST http://localhost:8000/api/v1/trigger-scraping \
  -H "Content-Type: application/json" \
  -d "{\"concept_id\": \"$CONCEPT_NAME\", \"concept_name\": \"$CONCEPT_NAME\"}" | jq .

echo ""
echo "⏳ Waiting 10 seconds for scraping to complete..."
sleep 10

# Step 4: Test the concept detail API
echo ""
echo "🎯 Testing concept detail API..."
curl -s -X POST http://localhost:8000/api/v1/concept-detail \
  -H "Content-Type: application/json" \
  -d "{\"concept_id\": \"$CONCEPT_NAME\"}" | jq '{
    success: .success,
    concept_name: .concept.name,
    learning_resources_count: (.learning_resources | length),
    sample_resource: (.learning_resources[0] | if . then {title: .title, source: .source_domain} else null end)
  }'

echo ""
echo "✅ Test completed!"