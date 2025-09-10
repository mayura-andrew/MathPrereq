#!/bin/bash

echo "🔍 Checking MongoDB Initialization Script"
echo "========================================"

# Check if the init script exists
if [ -f "scripts/init-mongo.js" ]; then
    echo "✅ MongoDB init script found: scripts/init-mongo.js"
    echo ""
    echo "Script contents:"
    echo "=================="
    cat scripts/init-mongo.js
    echo ""
    echo "=================="
else
    echo "❌ MongoDB init script not found: scripts/init-mongo.js"
    echo "Creating default init script..."
    
    cat > scripts/init-mongo.js << 'EOF'
// MongoDB initialization script
db = db.getSiblingDB('admin');

// Create admin user with proper permissions
db.createUser({
    user: 'admin',
    pwd: 'password123',
    roles: [
        {
            role: 'userAdminAnyDatabase',
            db: 'admin'
        },
        {
            role: 'readWriteAnyDatabase',
            db: 'admin'
        },
        {
            role: 'dbAdminAnyDatabase',
            db: 'admin'
        }
    ]
});

// Switch to mathprereq database
db = db.getSiblingDB('mathprereq');

// Grant additional permissions on mathprereq database
db.grantRolesToUser('admin', [
    { role: 'readWrite', db: 'mathprereq' },
    { role: 'dbAdmin', db: 'mathprereq' }
]);

print('✅ MongoDB user created with proper permissions');
EOF
    
    echo "✅ Created scripts/init-mongo.js"
fi

echo ""
echo "Checking if init script is mounted in docker-compose.yml:"
if grep -q "init-mongo.js" docker-compose.yml; then
    echo "✅ Init script is mounted in docker-compose.yml"
else
    echo "❌ Init script is NOT mounted in docker-compose.yml"
    echo "Add this to the mongodb service in docker-compose.yml:"
    echo "    volumes:"
    echo "      - ./scripts/init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro"
fi

echo ""
echo "To apply the init script:"
echo "1. docker-compose down"
echo "2. docker-compose up mongodb -d"
echo "3. Wait 30 seconds for initialization"
echo "4. Test the connection"