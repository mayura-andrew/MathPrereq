#!/bin/bash

echo "🧪 Testing Web Scraper Integration with Concept Details"

# Test 1: Check if server is running
echo "📡 Testing server health..."
curl -s http://localhost:8000/health | jq .

# Test 2: Get concept detail (should now include learning resources)
echo ""
echo "📚 Testing concept detail with learning resources..."
curl -s -X POST http://localhost:8000/api/v1/concept-detail \
  -H "Content-Type: application/json" \
  -d '{"concept_id": "derivatives"}' | jq '.learning_resources | length'

echo "Found learning resources for derivatives concept"

# Test 3: Trigger manual resource scraping for a concept
echo ""
echo "🕷️  Testing manual resource scraping trigger..."
curl -s -X POST http://localhost:8000/api/v1/trigger-scraping \
  -H "Content-Type: application/json" \
  -d '{"concept_id": "integration", "concept_name": "Integration"}' | jq .

echo ""
echo "✅ Integration test completed!"

# Test 4: Check MongoDB for scraped resources
echo ""
echo "🗄️  Checking MongoDB for scraped resources..."
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --eval "
  print('📊 Educational Resources Statistics:');
  print('Total resources:', db.educational_resources.countDocuments());
  print('');
  print('📋 Sample resources:');
  db.educational_resources.find().limit(3).forEach(function(doc) {
    print('- Title:', doc.title);
    print('  URL:', doc.url);  
    print('  Quality:', doc.quality_score);
    print('  Source:', doc.source_domain);
    print('');
  });
"