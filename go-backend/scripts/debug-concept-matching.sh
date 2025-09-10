#!/bin/bash

echo "🔍 Debugging Learning Resources - Concept Name Matching"

# Make script executable
chmod +x scripts/debug-learning-resources.sh

# Run the debug script first to see what's in MongoDB
echo "📊 Checking MongoDB contents..."
./scripts/debug-learning-resources.sh

echo ""
echo "🎯 Now let's check what concept names are in your Neo4j vs MongoDB..."

echo ""
echo "📋 Neo4j concepts (from API):"
curl -s http://localhost:8000/api/v1/concepts | jq -r '.[].name' | head -10

echo ""
echo "📋 MongoDB concept_ids (from scraper):"
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --quiet --eval "
db.educational_resources.distinct('concept_id').forEach(function(id) { 
    print(id); 
});
" | head -10

echo ""
echo "📋 MongoDB concept_names (from scraper):"
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --quiet --eval "
db.educational_resources.distinct('concept_name').forEach(function(name) { 
    print(name); 
});
" | head -10

echo ""
echo "✅ Debugging completed! Check if Neo4j concept names match MongoDB concept_id or concept_name fields."