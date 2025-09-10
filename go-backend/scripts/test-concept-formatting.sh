#!/bin/bash

echo "🧪 Testing Concept Name Formatting Fixes"
echo "========================================"

BASE_URL="http://localhost:8080/api/v1"

# Test concepts with various formatting issues
test_concepts=(
    "Basic Functions"
    "Polar Coordinates"
    "Linear%20Algebra"
    "basic_functions"
    "polar-coordinates"
    "Matrix   Operations"
    "Differential Equations"
)

echo "Testing resource finding for formatted concept names..."

for concept in "${test_concepts[@]}"; do
    echo -e "\n🔍 Testing concept: '$concept'"
    
    # URL encode the concept for the API call
    encoded_concept=$(echo "$concept" | sed 's/ /%20/g')
    
    # Test resource finding
    echo "Finding resources..."
    response=$(curl -s -w "HTTP_CODE:%{http_code}" \
        -X POST "$BASE_URL/resources/find/$encoded_concept" \
        -H "Content-Type: application/json" \
        -H "X-Request-ID: test-$(date +%s)")
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    json_response=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*//')
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Resource finding successful"
        success=$(echo "$json_response" | jq -r '.success // false')
        message=$(echo "$json_response" | jq -r '.message // "No message"')
        echo "   Success: $success"
        echo "   Message: $message"
    else
        echo "❌ Resource finding failed (HTTP $http_code)"
        echo "   Response: $json_response"
    fi
    
    sleep 1
done

echo -e "\n📝 Testing smart concept query..."

for concept in "${test_concepts[@]:0:3}"; do  # Test first 3 concepts
    echo -e "\n🧠 Testing smart query: '$concept'"
    
    response=$(curl -s -w "HTTP_CODE:%{http_code}" \
        -X POST "$BASE_URL/concept-query" \
        -H "Content-Type: application/json" \
        -d "{\"concept_name\":\"$concept\",\"user_id\":\"test_user\"}")
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    json_response=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*//')
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Smart query successful"
        success=$(echo "$json_response" | jq -r '.success // false')
        source=$(echo "$json_response" | jq -r '.source // "unknown"')
        processing_time=$(echo "$json_response" | jq -r '.processing_time // "unknown"')
        
        echo "   Success: $success"
        echo "   Source: $source" 
        echo "   Processing Time: $processing_time"
    else
        echo "❌ Smart query failed (HTTP $http_code)"
        echo "   Response: $json_response"
    fi
    
    sleep 2
done

echo -e "\n🎉 Concept name formatting tests completed!"