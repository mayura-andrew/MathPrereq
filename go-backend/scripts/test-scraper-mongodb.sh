#!/bin/bash

echo "🔧 Testing MongoDB Connection for Scraper"

# Set the environment variable explicitly
export MONGODB_URI="mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin"

echo "🌐 Environment variables:"
echo "MONGODB_URI: $MONGODB_URI"

# Test MongoDB connection first
echo ""
echo "🔍 Testing MongoDB connection..."
mongosh "$MONGODB_URI" --eval "
print('✅ MongoDB connection test:');
print('Database:', db.getName());
print('Auth:', db.runCommand({connectionStatus: 1}).authInfo.authenticatedUsers);
print('Collections:', db.getCollectionNames());
print('Resources count:', db.educational_resources.countDocuments());
"

echo ""
echo "🕷️ Running scraper with explicit MongoDB URI..."
go run ./cmd/scraper --concepts "derivatives" "integration"

echo ""
echo "📊 Checking results in MongoDB..."
mongosh "$MONGODB_URI" --eval "
print('Resources after scraping:');
print('Total:', db.educational_resources.countDocuments());
if (db.educational_resources.countDocuments() > 0) {
    print('Sample resource:');
    db.educational_resources.findOne({}, {title: 1, concept_id: 1, concept_name: 1});
}
"