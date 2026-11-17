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

# Detect Docker Compose (v2 plugin first, then the standalone binary)
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
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

# A local edit to docker-compose.yml blocks the pull, and discarding it to
# get unstuck would throw away an inline ENCRYPTION_KEY. Stop and explain.
if ! git diff --quiet HEAD -- docker-compose.yml; then
    echo -e "${RED}docker-compose.yml has local edits, which would block this update.${NC}"
    echo ""
    git --no-pager diff HEAD -- docker-compose.yml
    echo ""
    echo -e "Copy each value you changed into ${YELLOW}.env${NC} (for example ENCRYPTION_KEY=...),"
    echo -e "then discard the edit with: ${YELLOW}git checkout -- docker-compose.yml${NC}"
    echo -e "${RED}Do not discard it first: without your ENCRYPTION_KEY in .env, saved API keys stop decrypting.${NC}"
    exit 1
fi

# Fetch latest changes
echo -e "${GREEN}[2/5]${NC} Fetching latest changes from GitHub..."
git fetch origin

# Checkout and pull the specified branch
echo -e "${GREEN}[3/5]${NC} Checking out branch: ${YELLOW}$BRANCH${NC}"
git checkout "$BRANCH"
git pull origin "$BRANCH"

# Stop existing containers
echo -e "${GREEN}[4/5]${NC} Stopping existing containers..."
$COMPOSE_CMD down

# Pull latest images and start containers
echo -e "${GREEN}[5/5]${NC} Pulling latest images and starting containers..."
$COMPOSE_CMD pull
$COMPOSE_CMD up -d --force-recreate

# Poll the app until it actually responds, so the success message below only
# prints once the app is reachable in a browser — not just "container started".
# The probe runs *inside* the container (busybox wget is always in the image),
# so the only host dependency is Docker itself — works on Windows, macOS,
# Raspberry Pi, etc. without needing curl/wget on the host. The loop exits the
# instant the app answers; the 5-minute deadline is only a ceiling for a boot
# that never comes up.
echo -e "${YELLOW}Waiting for app to become reachable...${NC}"
DEADLINE=$((SECONDS + 300))
until $COMPOSE_CMD exec -T app wget --spider -q http://127.0.0.1:3737 >/dev/null 2>&1; do
    if [ "$SECONDS" -ge "$DEADLINE" ]; then
        echo -e "${RED}App did not become reachable within 5 minutes.${NC}"
        $COMPOSE_CMD logs --tail=40
        exit 1
    fi
    sleep 2
done

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
