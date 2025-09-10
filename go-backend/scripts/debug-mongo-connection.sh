#!/bin/bash

echo "🔍 MongoDB Connection Debug"
echo "=========================="

# Check if MongoDB container is running
echo "1. Container Status:"
docker-compose ps mongodb

echo ""

# Test connection with different auth methods
echo "2. Testing different connection strings:"

echo "Test A - Standard auth:"
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --eval "
try {
    print('✅ Connected successfully');
    print('Database:', db.getName());
    const ping = db.runCommand({ping: 1});
    print('Ping result:', ping.ok);
} catch (error) {
    print('❌ Error:', error.message);
}
" 2>/dev/null || echo "❌ Connection failed"

echo ""

echo "Test B - Without authSource:"
mongosh "mongodb://admin:password123@localhost:27017/mathprereq" --eval "
try {
    print('✅ Connected successfully');
    const ping = db.runCommand({ping: 1});
    print('Ping result:', ping.ok);
} catch (error) {
    print('❌ Error:', error.message);
}
" 2>/dev/null || echo "❌ Connection failed"

echo ""

echo "Test C - Check user authentication:"
mongosh "mongodb://admin:password123@localhost:27017/admin" --eval "
try {
    print('✅ Connected to admin database');
    const users = db.getUsers();
    print('Users found:', users.users ? users.users.length : 0);
    if (users.users && users.users.length > 0) {
        print('User roles:', JSON.stringify(users.users[0].roles));
    }
} catch (error) {
    print('❌ Error:', error.message);
}
" 2>/dev/null || echo "❌ Connection failed"

echo ""

echo "3. MongoDB Container Logs:"
docker-compose logs mongodb --tail=10

echo ""
echo "=========================="
echo "📋 If Test A works but Go app fails, issue is in Go client usage"
echo "📋 If Test A fails, issue is MongoDB authentication setup"