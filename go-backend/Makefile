.PHONY: help build run test clean dev-up dev-down migrate migrate-clean services-up services-down

DOCKER_COMPOSE_DEV = docker-compose -f docker-compose.yml -f docker-compose.dev.yml
DOCKER_COMPOSE = docker-compose

# Load environment variables from .env file
include .env
export

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build the Go application
	go build -o bin/server ./cmd/server
	go build -o bin/migrate-neo4j ./cmd/migrate/csv-to-neo4j.go
	go build -o bin/migrate-weaviate ./cmd/migrate/textbook-to-weaviate.go
	go build -o bin/scraper ./cmd/scraper

scrape: ## Run the educational resource scraper
	@echo "🕷️  Starting educational resource scraper..."
	go run ./cmd/scraper

scrape-concepts: ## Run scraper for specific concepts (usage: make scrape-concepts CONCEPTS="derivatives integration")
	@echo "🕷️  Scraping specific concepts: $(CONCEPTS)"
	@echo "🔧 Loading environment variables from .env file..."
	@export MONGODB_URI="mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" && \
	go run ./cmd/scraper --concepts $(CONCEPTS)

run: ## Run the application locally
	go run ./cmd/server

test: ## Run tests
	go test -v -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

clean: ## Clean build artifacts
	rm -rf bin/
	rm -f coverage.out coverage.html
	go mod tidy

dev-up: ## Start development environment
	@echo "🚀 Starting development environment..."
	$(DOCKER_COMPOSE_DEV) up --build

dev-down: ## Stop development environment
	@echo "🛑 Stopping development environment..."
	$(DOCKER_COMPOSE_DEV) down

prod-up: ## Start production environment
	@echo "🚀 Starting production environment..."
	$(DOCKER_COMPOSE) up -d --build

prod-down: ## Stop production environment
	@echo "🛑 Stopping production environment..."
	$(DOCKER_COMPOSE) down

migrate: services-up ## Run database migrations
	@echo "📊 Running Neo4j and Weaviate migration..."
	go run ./cmd/migrate/*.go
	@echo "✅ Migrations completed"

migrate-clean: services-down ## Clean all data and run fresh migration
	docker-compose down -v  # Remove volumes
	$(MAKE) migrate

services-up: ## Start all services
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 10

services-down: ## Stop all services  
	docker-compose down

logs: ## Show logs from all services
	$(DOCKER_COMPOSE_DEV) logs -f

logs-api: ## Show API logs only
	$(DOCKER_COMPOSE_DEV) logs -f api-dev

health: ## Check health of all services
	@echo "🏥 Checking service health..."
	@curl -f http://localhost:8000/health || echo "❌ API unhealthy"
	@curl -f http://localhost:7474 || echo "❌ Neo4j unhealthy"
	@curl -f http://localhost:8080/v1/.well-known/ready || echo "❌ Weaviate unhealthy"

install: ## Install dependencies
	go mod download
	go mod tidy

lint: ## Run linting
	golangci-lint run

format: ## Format code
	go fmt ./...
	goimports -w .

docker-build: ## Build Docker image
	docker build -t math-learning-framework:latest .

docker-run: ## Run Docker container
	docker run -p 8000:8000 math-learning-framework:latest

# MongoDB Management Commands
.PHONY: mongodb-up mongodb-down mongodb-logs mongodb-test mongodb-reset mongodb-shell

# Start MongoDB
mongodb-up:
	@echo "🚀 Starting MongoDB..."
	docker compose up mongodb -d
	@echo "⏳ Waiting for MongoDB to initialize..."
	sleep 10
	@echo "✅ MongoDB started!"

# Stop MongoDB
mongodb-down:
	@echo "🛑 Stopping MongoDB..."
	docker compose stop mongodb
	@echo "✅ MongoDB stopped!"

# View MongoDB logs
mongodb-logs:
	@echo "📋 MongoDB logs:"
	docker compose logs -f mongodb

# Test MongoDB connection
mongodb-test:
	@echo "🔍 Testing MongoDB connection..."
	@chmod +x scripts/test-mongodb.sh
	@./scripts/test-mongodb.sh

# Reset MongoDB (removes all data)
mongodb-reset:
	@echo "⚠️  WARNING: This will delete all MongoDB data!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "🗑️  Stopping and removing MongoDB container..."
	docker-compose down mongodb
	docker volume rm go-backend_mongodb_data 2>/dev/null || true
	@echo "🚀 Starting fresh MongoDB..."
	docker-compose up mongodb -d
	@echo "✅ MongoDB reset completed!"

# Access MongoDB shell
mongodb-shell:
	@echo "🐚 Opening MongoDB shell (use exit to quit)..."
	@mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" || \
	docker-compose exec mongodb mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin"

# Check MongoDB status
mongodb-status:
	@echo "📊 MongoDB Status:"
	@docker compose ps mongodb
	@echo ""
	@echo "🔍 Quick health check:"
	@mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --eval "db.runCommand({ping: 1})" --quiet || echo "❌ MongoDB connection failed"

# Test scraper with environment variables
test-scraper:
	@echo "🧪 Testing scraper with environment setup..."
	@chmod +x scripts/test-scraper-mongodb.sh
	@./scripts/test-scraper-mongodb.sh

# Test learning resources API
test-learning-resources:
	@echo "🧪 Testing Learning Resources API..."
	@chmod +x scripts/test-learning-resources-api.sh
	@./scripts/test-learning-resources-api.sh

# Test integrated API with web scraper
test-integrated-api:
	@echo "🧪 Testing Integrated Learning Resources API..."
	@chmod +x scripts/test-integrated-api.sh
	@./scripts/test-integrated-api.sh

# Start integrated API server with all components
start-integrated:
	@echo "🚀 Starting Integrated Learning Resources API..."
	@chmod +x scripts/start-integrated-api.sh
	@./scripts/start-integrated-api.sh

# Test complete integration (learning resources + scraper + API)
test-complete:
	@echo "🧪 Testing Complete Integrated System..."
	@chmod +x scripts/test-complete-integration.sh
	@./scripts/test-complete-integration.sh

# Debug learning resources issues
debug-learning:
	@echo "🔧 Debugging Learning Resources..."
	@chmod +x scripts/debug-learning-resources.sh
	@./scripts/debug-learning-resources.sh

# Fix MongoDB authentication issues
fix-mongodb:
	@echo "🚀 Fixing MongoDB Authentication..."
	@chmod +x scripts/fix-mongodb-auth.sh
	@./scripts/fix-mongodb-auth.sh

# Test MongoDB authentication fix
test-auth-fix:
	@echo "🔧 Testing Authentication Fix..."
	@chmod +x scripts/test-auth-fix.sh
	@./scripts/test-auth-fix.sh

# Test shared client authentication
test-shared-client:
	@echo "🧪 Testing Shared Client Authentication..."
	@chmod +x scripts/test-shared-client-auth.sh
	@./scripts/test-shared-client-auth.sh

# Complete MongoDB authentication fix
fix-mongo-complete:
	@echo "🔧 Complete MongoDB Authentication Fix..."
	@chmod +x scripts/fix-mongo-auth-complete.sh
	@./scripts/fix-mongo-auth-complete.sh

# Test basic MongoDB connection
test-mongo-basic:
	@echo "🔍 Testing Basic MongoDB Connection..."
	@chmod +x scripts/test-mongo-basic.sh
	@./scripts/test-mongo-basic.sh

# Check MongoDB connection and container
check-mongodb:
	@echo "🔍 Checking MongoDB Connection and Container..."
	@chmod +x scripts/check-mongodb.sh
	@./scripts/check-mongodb.sh

# Diagnose MongoDB issues
diagnose-mongodb:
	@echo "🔍 Diagnosing MongoDB Issues..."
	@chmod +x scripts/diagnose-mongodb.sh
	@./scripts/diagnose-mongodb.sh

# Complete MongoDB diagnosis
mongodb-diagnosis:
	@echo "🔍 Complete MongoDB Container Diagnosis..."
	@chmod +x scripts/mongodb-full-diagnosis.sh
	@./scripts/mongodb-full-diagnosis.sh

# Analyze MongoDB connection issues
analyze-mongo:
	@echo "🔍 Analyzing MongoDB Connection..."
	@chmod +x scripts/analyze-mongo-connection.sh
	@./scripts/analyze-mongo-connection.sh
