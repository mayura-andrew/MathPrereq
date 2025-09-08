.PHONY: help build run test clean dev-up dev-down migrate migrate-clean services-up services-down

DOCKER_COMPOSE_DEV = docker-compose -f docker-compose.yml -f docker-compose.dev.yml
DOCKER_COMPOSE = docker-compose

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build the Go application
	go build -o bin/server ./cmd/server
	go build -o bin/migrate-neo4j ./cmd/migrate/csv-to-neo4j.go
	go build -o bin/migrate-weaviate ./cmd/migrate/textbook-to-weaviate.go

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
