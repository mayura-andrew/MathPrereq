#!/bin/bash

echo "🔍 Testing MongoDB Connection..."

# Test with correct credentials
MONGO_URI="mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin"

echo "📝 Connection string: ${MONGO_URI}"

# Test connection with mongosh
if command -v mongosh &> /dev/null; then
    echo "🔗 Testing with mongosh..."
    mongosh "${MONGO_URI}" --eval "
        print('✅ MongoDB connection successful!');
        print('📊 Testing mathprereq database...');
        print('📋 Collections:');
        show collections;
        print('🔍 Testing educational_resources collection...');
        db.educational_resources.stats();
        print('🎉 Database test completed!');
    "
else
    echo "⚠️  mongosh not found, testing with Docker..."
    docker compose exec mongodb mongosh "${MONGO_URI}" --eval "
        print('✅ MongoDB connection successful!');
        print('📊 Testing mathprereq database...');
        show collections;
        db.educational_resources.stats();
    "
fi

echo "✅ MongoDB connection test completed!"