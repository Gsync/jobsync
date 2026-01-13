#!/bin/bash

# JobSync Deployment Script
# Usage: ./deploy.sh [branch-name]
# Example: ./deploy.sh main
# Example: ./deploy.sh develop

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default branch
DEFAULT_BRANCH="main"
BRANCH="${1:-$DEFAULT_BRANCH}"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}JobSync Deployment Script${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${GREEN}[1/5]${NC} Current directory: $SCRIPT_DIR"
echo ""

# Detect Docker Compose command
if command -v docker compose &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}Error: Neither 'docker compose' nor 'docker-compose' found${NC}"
    exit 1
fi

echo -e "Using: ${YELLOW}$COMPOSE_CMD${NC}"
echo ""

# Check if git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}Error: Not a git repository${NC}"
    exit 1
fi

# Fetch latest changes
echo -e "${GREEN}[2/5]${NC} Fetching latest changes from GitHub..."
git fetch origin

# Checkout and pull the specified branch
echo -e "${GREEN}[3/5]${NC} Checking out branch: ${YELLOW}$BRANCH${NC}"
git checkout "$BRANCH"

echo -e "${GREEN}[3/5]${NC} Pulling latest changes..."
git pull origin "$BRANCH"

# Stop existing containers
echo -e "${GREEN}[4/5]${NC} Stopping existing containers..."
$COMPOSE_CMD down

# Build and start containers
echo -e "${GREEN}[5/5]${NC} Building and starting containers..."
$COMPOSE_CMD up -d --build

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Branch: ${YELLOW}$BRANCH${NC}"
echo -e "Checking container status..."
echo ""

# Show running containers
$COMPOSE_CMD ps

echo ""
echo -e "${GREEN}Deployment logs (last 20 lines):${NC}"
$COMPOSE_CMD logs --tail=20

echo ""
echo -e "${YELLOW}Tip:${NC} View live logs with: ${YELLOW}$COMPOSE_CMD logs -f${NC}"
