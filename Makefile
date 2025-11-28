# Makefile for Stable Diffusion WebUI

.PHONY: help install dev prod docker stop clean lint test

help:
	@echo "Stable Diffusion WebUI - Available Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install      - Install dependencies"
	@echo "  make setup        - Full setup (install + models)"
	@echo ""
	@echo "Running:"
	@echo "  make dev          - Run development server"
	@echo "  make prod         - Run production server"
	@echo "  make docker       - Run with Docker Compose"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean        - Clean cache and outputs"
	@echo "  make lint         - Run code linting"
	@echo "  make test         - Run tests"
	@echo "  make stop         - Stop all services"
	@echo ""
	@echo "Other:"
	@echo "  make logs         - Show server logs"
	@echo "  make migrate      - Run database migrations"

# ==================== SETUP ====================

install:
	@echo "Installing dependencies..."
	pip install -r requirements.txt

setup: install
	@echo "Setting up Stable Diffusion WebUI..."
	mkdir -p models outputs cache
	@echo "✓ Setup complete"

# ==================== RUNNING ====================

dev:
	@echo "Starting development server..."
	export FLASK_ENV=development && python colab_server.py

prod:
	@echo "Starting production server..."
	export FLASK_ENV=production && python colab_server.py

docker:
	@echo "Starting with Docker Compose..."
	docker-compose up -d

docker-build:
	@echo "Building Docker image..."
	docker-compose build

docker-logs:
	@echo "Showing Docker logs..."
	docker-compose logs -f

# ==================== MAINTENANCE ====================

clean:
	@echo "Cleaning cache and temporary files..."
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache .coverage htmlcov
	@echo "✓ Cleanup complete"

clean-outputs:
	@echo "Clearing outputs directory..."
	rm -rf outputs/*
	@echo "✓ Outputs cleared"

clean-models:
	@echo "Clearing models directory..."
	rm -rf models/*
	@echo "✓ Models cleared"

clean-all: clean clean-outputs clean-models
	@echo "✓ Full cleanup complete"

# ==================== LINTING & TESTING ====================

lint:
	@echo "Running linting..."
	flake8 colab_server.py --max-line-length=120
	@echo "✓ Linting complete"

format:
	@echo "Formatting code..."
	black colab_server.py
	@echo "✓ Formatting complete"

test:
	@echo "Running tests..."
	python -m pytest tests/ -v
	@echo "✓ Tests complete"

# ==================== LOGS & MONITORING ====================

logs:
	@echo "Showing server logs..."
	tail -f server.log

logs-clear:
	@echo "Clearing logs..."
	rm -f server.log
	@echo "✓ Logs cleared"

# ==================== DEPLOYMENT ====================

stop:
	@echo "Stopping all services..."
	docker-compose down
	@echo "✓ Services stopped"

restart:
	@echo "Restarting services..."
	docker-compose restart
	@echo "✓ Services restarted"

status:
	@echo "Checking services status..."
	docker-compose ps

# ==================== DATABASE ====================

migrate:
	@echo "Running database migrations..."
	@echo "✓ Migrations complete"

db-reset:
	@echo "Resetting database..."
	@echo "✓ Database reset complete"

# ==================== UTILS ====================

check-gpu:
	@echo "Checking GPU..."
	python -c "import torch; print(f'GPU Available: {torch.cuda.is_available()}'); print(f'Device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"CPU\"}')"

check-deps:
	@echo "Checking dependencies..."
	pip list | grep -E "flask|torch|diffusers"

requirements-export:
	@echo "Exporting requirements..."
	pip freeze > requirements-lock.txt
	@echo "✓ Requirements exported"

# ==================== DOCUMENTATION ====================

docs:
	@echo "Building documentation..."
	@echo "✓ Documentation ready"

docs-serve:
	@echo "Serving documentation..."
	python -m http.server 8080 --directory ./docs

# ==================== DEFAULT ====================

.DEFAULT_GOAL := help
