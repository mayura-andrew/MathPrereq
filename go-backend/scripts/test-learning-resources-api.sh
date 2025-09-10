#!/bin/bash

echo "🧪 Testing Standalone Learning Resources API"

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

# Test 2: Get learning resources stats
echo -e "${BLUE}📊 Getting learning resources statistics...${NC}"
curl -s http://localhost:8000/api/v1/learning-resources/stats | jq .

echo ""

# Test 3: Find learning resources for a concept (without force refresh)
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

# Test 4: Find learning resources with specific filters
echo -e "${BLUE}🎯 Finding video resources for 'integration' (beginner level)...${NC}"
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
    scraping_triggered: .scraping_triggered,
    resources: (.resources | map({title: .title, resource_type: .resource_type, difficulty_level: .difficulty_level}))
  }'

echo ""

# Test 5: Force refresh resources for a concept
echo -e "${YELLOW}🔄 Force refreshing resources for 'limits'...${NC}"
curl -s -X POST http://localhost:8000/api/v1/learning-resources/find \
  -H "Content-Type: application/json" \
  -d '{
    "concept_name": "limits",
    "force_refresh": true,
    "limit": 4
  }' | jq '{
    success: .success,
    concept_name: .concept_name,
    total_resources: .total_resources,
    scraping_triggered: .scraping_triggered,
    last_updated: .last_updated
  }'

echo ""

# Test 6: Test error handling with invalid request
echo -e "${BLUE}❌ Testing error handling (missing concept_name)...${NC}"
curl -s -X POST http://localhost:8000/api/v1/learning-resources/find \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 5
  }' | jq .

echo ""

# Test 7: Check MongoDB directly for verification
echo -e "${BLUE}🗄️ Checking MongoDB for scraped resources...${NC}"
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --quiet --eval "
print('📊 MongoDB Learning Resources:');
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
echo -e "${GREEN}✅ Learning Resources API testing completed!${NC}"

# Summary
echo ""
echo -e "${YELLOW}📋 API Endpoints Summary:${NC}"
echo "• POST /api/v1/learning-resources/find - Find learning resources for a concept"
echo "• GET  /api/v1/learning-resources/stats - Get learning resources statistics"
echo ""
echo -e "${YELLOW}🔧 Request Example:${NC}"
echo 'curl -X POST http://localhost:8000/api/v1/learning-resources/find \'
echo '  -H "Content-Type: application/json" \'
echo '  -d "{"concept_name": "calculus", "limit": 5}"'