#!/bin/bash

set -e

echo "🧪 Running Mathematics Learning Framework Test Suite"
echo "===================================================="

# Change to backend directory
cd backend

# Activate virtual environment
source ../venv/bin/activate

# Install test dependencies if not already installed
pip install pytest pytest-asyncio pytest-cov httpx

echo "📊 Running tests with coverage..."

# Run tests with coverage
python -m pytest tests/ -v \
    --cov=app \
    --cov-report=html \
    --cov-report=term-missing \
    --cov-fail-under=70

echo ""
echo "✅ Tests completed!"
echo "📈 Coverage report generated in backend/htmlcov/"
echo ""

# Check if coverage is acceptable
COVERAGE=$(python -c "
import coverage
cov = coverage.Coverage()
cov.load()
print(f'{cov.report():.1f}')
" 2>/dev/null || echo "0")

if (( $(echo "$COVERAGE < 70" | bc -l) )); then
    echo "⚠️  Warning: Test coverage is below 70% ($COVERAGE%)"
else
    echo "✅ Test coverage is good: $COVERAGE%"
fi