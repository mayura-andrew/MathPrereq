#!/bin/bash

echo "🧪 Testing Integrated Learning Resources API Server"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Check server health
echo -e "${BLUE}📡 Testing server health...${NC}"
curl -s http://localhost:8000/health | jq .

echo ""

# Test 2: Check if MongoDB is accessible
echo -e "${BLUE}🗄️ Checking MongoDB status...${NC}"
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --quiet --eval "
print('📊 MongoDB Status:');
print('Database:', db.getName());
print('Collections:', db.getCollectionNames());
print('Current resources:', db.educational_resources.countDocuments());
"

echo ""

# Test 3: Get learning resources stats
echo -e "${BLUE}📊 Getting learning resources statistics...${NC}"
curl -s http://localhost:8000/api/v1/learning-resources/stats | jq .

echo ""

# Test 4: Trigger manual scraping for a concept
echo -e "${YELLOW}🕷️ Triggering manual scraping for 'derivatives'...${NC}"
curl -s -X POST http://localhost:8000/api/v1/trigger-scraping \
  -H "Content-Type: application/json" \
  -d '{
    "concept_name": "derivatives"
  }' | jq .

echo ""
echo -e "${YELLOW}⏳ Waiting 15 seconds for scraping to complete...${NC}"
sleep 15

# Test 5: Find learning resources for derivatives
echo -e "${BLUE}🔍 Finding learning resources for 'derivatives'...${NC}"
curl -s -X POST http://localhost:8000/api/v1/learning-resources/find \
  -H "Content-Type: application/json" \
  -d '{
    "concept_name": "derivatives",
    "limit": 5
  }' | jq '{
    success: .success,
    concept_name: .concept_name,
    total_resources: .total_resources,
    scraping_triggered: .scraping_triggered,
    sample_resources: (.resources[0:2] | map({title: .title, source_domain: .source_domain, quality_score: .quality_score}))
  }'

echo ""

# Test 6: Test with different concept
echo -e "${BLUE}🎯 Triggering scraping for 'integration'...${NC}"
curl -s -X POST http://localhost:8000/api/v1/trigger-scraping \
  -H "Content-Type: application/json" \
  -d '{
    "concept_name": "integration"
  }' | jq .

echo ""
echo -e "${YELLOW}⏳ Waiting 10 seconds...${NC}"
sleep 10

echo -e "${BLUE}🔍 Finding learning resources for 'integration'...${NC}"
curl -s -X POST http://localhost:8000/api/v1/learning-resources/find \
  -H "Content-Type: application/json" \
  -d '{
    "concept_name": "integration",
    "resource_types": ["video"],
    "difficulty_level": "beginner",
    "limit": 3
  }' | jq '{
    success: .success,
    concept_name: .concept_name,
    total_resources: .total_resources,
    resources: (.resources | map({title: .title, resource_type: .resource_type, difficulty_level: .difficulty_level}))
  }'

echo ""

# Test 7: Check MongoDB for scraped results
echo -e "${BLUE}🗄️ Checking MongoDB for scraped resources...${NC}"
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --quiet --eval "
print('📊 Final MongoDB Status:');
print('Total resources:', db.educational_resources.countDocuments());
print('');

print('📋 Resources by concept:');
db.educational_resources.aggregate([
  { \$group: { 
    _id: '\$concept_id', 
    count: { \$sum: 1 },
    avg_quality: { \$avg: '\$quality_score' }
  }},
  { \$sort: { count: -1 }},
  { \$limit: 5 }
]).forEach(function(doc) {
  print('  • ' + doc._id + ': ' + doc.count + ' resources (avg quality: ' + doc.avg_quality.toFixed(2) + ')');
});

print('');
print('📋 Recent resources:');
db.educational_resources.find({}, {title: 1, concept_id: 1, source_domain: 1, quality_score: 1, scraped_at: 1})
  .sort({scraped_at: -1})
  .limit(3)
  .forEach(function(doc) {
    print('  • ' + doc.title + ' (' + doc.source_domain + ', quality: ' + doc.quality_score + ')');
  });
"

echo ""

# Test 8: Test the main query endpoint
echo -e "${BLUE}🤖 Testing main query endpoint...${NC}"
curl -s -X POST http://localhost:8000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How do I find the derivative of x^2?"
  }' | jq '{
    success: .success,
    identified_concepts: .identified_concepts,
    learning_path_count: .learning_path.total_concepts,
    explanation_length: (.explanation | length)
  }'

echo ""
echo -e "${GREEN}✅ Integrated Learning Resources API testing completed!${NC}"

# Summary
echo ""
echo -e "${YELLOW}📋 API Endpoints Summary:${NC}"
echo "• POST /api/v1/trigger-scraping - Manually trigger scraping for a concept"
echo "• POST /api/v1/learning-resources/find - Find learning resources for a concept"
echo "• GET  /api/v1/learning-resources/stats - Get learning resources statistics"
echo "• POST /api/v1/query - Main query endpoint (with integrated learning path)"
echo ""
echo -e "${YELLOW}🚀 Your integrated API server includes:${NC}"
echo "• ✅ Web scraper built-in (no separate service needed)"
echo "• ✅ MongoDB integration for resource storage"
echo "• ✅ Manual scraping triggers via API"
echo "• ✅ Automatic resource finding and background scraping"
echo "• ✅ Neo4j + Weaviate + LLM integration"