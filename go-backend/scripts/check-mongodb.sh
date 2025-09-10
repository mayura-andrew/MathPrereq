#!/bin/bash

echo "🔍 Testing MongoDB Connection and Setup"

# Check if MongoDB container is running
echo "Checking MongoDB container status..."
docker-compose ps mongodb

echo ""
echo "Testing MongoDB connection directly..."
timeout 10s mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --eval "
print('✅ MongoDB Connection Test:');
print('Connection successful:', db.runCommand({ping: 1}).ok === 1);
print('Database:', db.getName());
print('Current time:', new Date());
" || echo "❌ MongoDB connection failed or timed out"

echo ""
echo "If connection failed, try:"
echo "1. docker-compose up mongodb -d"
echo "2. docker-compose restart mongodb"
echo "3. Check logs: docker-compose logs mongodb"