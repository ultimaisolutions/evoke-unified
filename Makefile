.PHONY: up down setup install dev start-db stop-db worker build clean

# Start everything with Docker (single command!)
up:
	@echo "Starting Ad Analyzer..."
	docker-compose up --build

# Start in background
up-d:
	docker-compose up --build -d
	@echo "Services started! Frontend: http://localhost:5173"

# Stop all services
down:
	docker-compose down

# Initial setup (for local development without Docker)
setup: start-db install
	@echo "Setup complete! Run 'make dev' to start development servers."

# Install all dependencies locally
install:
	cd frontend && npm install
	cd backend && npm install
	cd workers && pip install -r requirements.txt

# Start development services locally (without Docker for app services)
dev:
	@echo "Starting database services..."
	docker-compose up -d postgres redis
	@echo "Waiting for services to be ready..."
	timeout /t 5 /nobreak > nul 2>&1 || sleep 5
	@start /B cmd /c "cd backend && npm run dev"
	@start /B cmd /c "cd workers && python -m src.worker"
	cd frontend && npm run dev

# Database commands
start-db:
	docker-compose up -d postgres redis
	@echo "Waiting for database to initialize..."
	timeout /t 10 /nobreak > nul 2>&1 || sleep 10

stop-db:
	docker-compose down

# Start just the worker
worker:
	cd workers && python -m src.worker

# Build frontend for production
build:
	cd frontend && npm run build

# View logs
logs:
	docker-compose logs -f

# Clean up
clean:
	docker-compose down -v
	rm -rf frontend/node_modules backend/node_modules
	rm -rf workers/venv workers/__pycache__
	rm -rf uploads/ads/* uploads/reactions/* uploads/exports/*

# Reset database (destructive!)
reset-db:
	docker-compose down -v
	docker-compose up -d postgres redis
	@echo "Database reset complete."
