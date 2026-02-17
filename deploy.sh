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

echo -e "${GREEN}[1/6]${NC} Current directory: $SCRIPT_DIR"
echo ""

# Detect Docker Compose (standalone v2 or plugin)
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    echo -e "${RED}Error: Docker Compose not found${NC}"
    exit 1
fi

echo -e "Using: ${YELLOW}$COMPOSE_CMD${NC}"
echo ""

# Check if git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}Error: Not a git repository${NC}"
    exit 1
fi

# Ensure .env exists and AUTH_SECRET is set
echo -e "${GREEN}[2/6]${NC} Checking environment configuration..."

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "  Created ${YELLOW}.env${NC} from .env.example"
    else
        echo -e "  ${RED}Warning: No .env.example found. Creating empty .env${NC}"
        touch .env
    fi
fi

# Generate AUTH_SECRET if missing or empty
if ! grep -q '^AUTH_SECRET=.\+' .env 2>/dev/null; then
    NEW_SECRET=$(openssl rand -base64 32)
    if grep -q '^AUTH_SECRET=' .env 2>/dev/null; then
        # AUTH_SECRET line exists but is empty — replace it (handle macOS vs Linux sed)
        if sed --version >/dev/null 2>&1; then
            sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=$NEW_SECRET|" .env
        else
            sed -i '' "s|^AUTH_SECRET=.*|AUTH_SECRET=$NEW_SECRET|" .env
        fi
    else
        echo "AUTH_SECRET=$NEW_SECRET" >> .env
    fi
    echo -e "  Generated ${YELLOW}AUTH_SECRET${NC} in .env"
else
    echo -e "  AUTH_SECRET already set in .env"
fi

echo ""

# Fetch latest changes
echo -e "${GREEN}[3/6]${NC} Fetching latest changes from GitHub..."
git fetch origin

# Checkout and pull the specified branch
echo -e "${GREEN}[4/6]${NC} Checking out branch: ${YELLOW}$BRANCH${NC}"
git checkout "$BRANCH"

echo -e "${GREEN}[4/6]${NC} Pulling latest changes..."
git pull origin "$BRANCH"

# Stop existing containers
echo -e "${GREEN}[5/6]${NC} Stopping existing containers..."
$COMPOSE_CMD down

# Build and start containers
echo -e "${GREEN}[6/6]${NC} Building and starting containers..."
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
