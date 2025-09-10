#!/bin/bash

echo "🔍 Complete MongoDB Container Diagnosis"
echo "========================================="

# 1. Check if Docker is running
echo "1. Docker Status:"
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        echo "   ✅ Docker is running"
    else
        echo "   ❌ Docker daemon is not running"
        echo "   👉 Start Docker Desktop or run: sudo systemctl start docker"
        exit 1
    fi
else
    echo "   ❌ Docker is not installed"
    exit 1
fi

echo ""

# 2. Check docker-compose
echo "2. Docker Compose:"
if command -v docker-compose &> /dev/null; then
    echo "   ✅ docker-compose is available"
    echo "   Version: $(docker-compose --version)"
else
    echo "   ❌ docker-compose not found"
fi

echo ""

# 3. Check if docker-compose.yml exists
echo "3. Configuration File:"
if [ -f "docker-compose.yml" ]; then
    echo "   ✅ docker-compose.yml found"
    echo "   MongoDB service defined: $(grep -q "mongodb:" docker-compose.yml && echo "Yes" || echo "No")"
else
    echo "   ❌ docker-compose.yml not found in current directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo ""

# 4. List all containers
echo "4. All Docker Containers:"
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

echo ""

# 5. Specific MongoDB container check
echo "5. MongoDB Container Status:"
MONGO_CONTAINERS=$(docker ps -a --filter "name=mongo" --format "{{.Names}} {{.Status}}")
if [ -z "$MONGO_CONTAINERS" ]; then
    echo "   ❌ No MongoDB containers found"
    echo "   👉 Try: docker-compose up mongodb -d"
else
    echo "   MongoDB containers found:"
    echo "$MONGO_CONTAINERS" | while read name status; do
        echo "   - $name: $status"
    done
fi

echo ""

# 6. Port check
echo "6. Port 27017 Status:"
if command -v netstat &> /dev/null; then
    PORT_CHECK=$(netstat -tlnp 2>/dev/null | grep :27017)
    if [ -n "$PORT_CHECK" ]; then
        echo "   ✅ Something is listening on port 27017:"
        echo "   $PORT_CHECK"
    else
        echo "   ❌ Nothing listening on port 27017"
    fi
else
    if command -v lsof &> /dev/null; then
        PORT_CHECK=$(lsof -i :27017 2>/dev/null)
        if [ -n "$PORT_CHECK" ]; then
            echo "   ✅ Something is listening on port 27017:"
            echo "$PORT_CHECK"
        else
            echo "   ❌ Nothing listening on port 27017"
        fi
    else
        echo "   ⚠️  Cannot check port (netstat/lsof not available)"
    fi
fi

echo ""

# 7. Try to start MongoDB
echo "7. Attempting to Start MongoDB:"
echo "   Running: docker-compose up mongodb -d"
docker-compose up mongodb -d

echo ""
echo "   Waiting 15 seconds for container to initialize..."
sleep 15

echo ""

# 8. Check container logs
echo "8. MongoDB Container Logs (last 10 lines):"
MONGO_CONTAINER=$(docker-compose ps -q mongodb 2>/dev/null)
if [ -n "$MONGO_CONTAINER" ]; then
    echo "   Container ID: $MONGO_CONTAINER"
    docker logs --tail=10 "$MONGO_CONTAINER" 2>&1 | sed 's/^/   /'
else
    echo "   ❌ Cannot find MongoDB container"
fi

echo ""

# 9. Connection test
echo "9. Connection Test:"
if command -v mongosh &> /dev/null; then
    echo "   Testing connection with mongosh..."
    timeout 10s mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --eval "
    print('=== MongoDB Connection Test ===');
    try {
        const result = db.runCommand({ping: 1});
        print('✅ Ping successful:', result.ok === 1);
        print('Database:', db.getName());
        print('Server info:', db.runCommand({buildInfo: 1}).version);
    } catch (error) {
        print('❌ Connection failed:', error.message);
    }
    " 2>/dev/null || echo "   ❌ Connection test failed or timed out"
else
    echo "   ⚠️  mongosh not available for testing"
fi

echo ""
echo "========================================="
echo "📋 Summary:"
echo "1. If no MongoDB container is running → Run: docker-compose up mongodb -d"
echo "2. If container exists but not responding → Check logs above for errors"
echo "3. If port 27017 is blocked → Kill other processes using that port"
echo "4. If still failing → Try: docker-compose down && docker-compose up mongodb -d"