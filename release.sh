#!/bin/bash

# JobSync Release & Docker Build Script
# Usage: ./release.sh [patch|minor|major]  (defaults to patch)

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BUMP_TYPE="${1:-patch}"
REGISTRY="ghcr.io"
IMAGE_NAME="gsync/jobsync"

if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
  echo -e "${RED}Error: Invalid bump type '$BUMP_TYPE'. Use patch, minor, or major.${NC}"
  exit 1
fi

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}JobSync Release Script${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Step 1: Validate git state
echo -e "${GREEN}[1/9]${NC} Validating git state..."
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  echo -e "${RED}Error: Must be on 'main' branch (currently on '$BRANCH')${NC}"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}Error: Working directory is not clean. Commit or stash changes first.${NC}"
  exit 1
fi

git pull origin main --ff-only
echo -e "  Branch: ${YELLOW}main${NC} (clean)"
echo ""

# Step 2: Run pre-release checks
echo -e "${GREEN}[2/9]${NC} Running tests..."
npm test
echo ""

echo -e "${GREEN}[3/9]${NC} Running linter..."
npm run lint
echo ""

# Step 3: Check prerequisites
echo -e "${GREEN}[4/9]${NC} Checking prerequisites..."

if ! docker buildx version >/dev/null 2>&1; then
  echo -e "${RED}Error: docker buildx is not available${NC}"
  exit 1
fi

# Load GITHUB_TOKEN from .env if not already set
if [ -z "$GITHUB_TOKEN" ] && [ -f .env ]; then
  GITHUB_TOKEN=$(grep -E '^GITHUB_TOKEN=' .env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
fi

if [ -z "$GITHUB_TOKEN" ]; then
  echo -e "${RED}Error: GITHUB_TOKEN is not set. Add it to .env or export it.${NC}"
  exit 1
fi

echo -e "  docker buildx: ${GREEN}OK${NC}"
echo -e "  GITHUB_TOKEN: ${GREEN}OK${NC}"
echo ""

# Step 4: Get previous version for changelog
PREV_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

# Step 5: Bump version (creates git tag automatically)
echo -e "${GREEN}[5/9]${NC} Bumping version (${YELLOW}$BUMP_TYPE${NC})..."
NEW_VERSION=$(npm version "$BUMP_TYPE" --no-git-tag-version)
echo -e "  New version: ${YELLOW}$NEW_VERSION${NC}"
echo ""

# Step 6: Generate changelog entry
echo -e "${GREEN}[6/9]${NC} Updating CHANGELOG.md..."
VERSION_NUMBER="${NEW_VERSION#v}"
TODAY=$(date +%Y-%m-%d)

if [ -n "$PREV_TAG" ]; then
  COMPARE_URL="https://github.com/Gsync/jobsync/compare/${PREV_TAG}...${NEW_VERSION}"
  LOG_RANGE="${PREV_TAG}..HEAD"
else
  COMPARE_URL=""
  LOG_RANGE=""
fi

CHANGELOG_ENTRY="## [$VERSION_NUMBER]($COMPARE_URL) ($TODAY)"$'\n'$'\n'

FEATURES=""
FIXES=""
OTHER=""

while IFS= read -r line; do
  [ -z "$line" ] && continue
  if echo "$line" | grep -qiE '^feat'; then
    msg=$(echo "$line" | sed -E 's/^feat(\([^)]*\))?:\s*//')
    FEATURES="${FEATURES}* ${msg}"$'\n'
  elif echo "$line" | grep -qiE '^fix'; then
    msg=$(echo "$line" | sed -E 's/^fix(\([^)]*\))?:\s*//')
    FIXES="${FIXES}* ${msg}"$'\n'
  else
    cleaned=$(echo "$line" | sed -E 's/^[a-z]+(\([^)]*\))?:\s*//')
    OTHER="${OTHER}* ${cleaned}"$'\n'
  fi
done < <(git log ${LOG_RANGE} --pretty=format:"%s" --no-merges)

if [ -n "$FEATURES" ]; then
  CHANGELOG_ENTRY="${CHANGELOG_ENTRY}"$'\n'"### Features"$'\n'$'\n'"${FEATURES}"
fi

if [ -n "$FIXES" ]; then
  CHANGELOG_ENTRY="${CHANGELOG_ENTRY}"$'\n'"### Bug Fixes"$'\n'$'\n'"${FIXES}"
fi

if [ -n "$OTHER" ]; then
  CHANGELOG_ENTRY="${CHANGELOG_ENTRY}"$'\n'"### Other Changes"$'\n'$'\n'"${OTHER}"
fi

# Prepend new entry after the header line
if [ -f CHANGELOG.md ]; then
  HEADER=$(head -1 CHANGELOG.md)
  EXISTING=$(tail -n +2 CHANGELOG.md)
  printf '%s\n\n%s\n%s\n' "$HEADER" "$CHANGELOG_ENTRY" "$EXISTING" > CHANGELOG.md
else
  printf '# Changelog\n\n%s\n' "$CHANGELOG_ENTRY" > CHANGELOG.md
fi

echo -e "  Changelog updated"
echo ""

# Step 7: Commit, tag, and push
echo -e "${GREEN}[7/9]${NC} Committing and tagging..."
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): ${VERSION_NUMBER}"
git tag -a "$NEW_VERSION" -m "Release $NEW_VERSION"
git push origin main
git push origin "$NEW_VERSION"
echo ""

# Step 8: Login to GHCR and build
echo -e "${GREEN}[8/9]${NC} Logging in to GHCR..."
echo "$GITHUB_TOKEN" | docker login "$REGISTRY" -u gsync --password-stdin
echo ""

# Step 9: Build and push multi-arch image
echo -e "${GREEN}[9/9]${NC} Building and pushing Docker image..."
MAJOR=$(echo "$VERSION_NUMBER" | cut -d. -f1)
MINOR=$(echo "$VERSION_NUMBER" | cut -d. -f1-2)

# Ensure buildx builder exists
docker buildx inspect jobsync-builder >/dev/null 2>&1 || \
  docker buildx create --name jobsync-builder --use

docker buildx use jobsync-builder

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag "${REGISTRY}/${IMAGE_NAME}:${VERSION_NUMBER}" \
  --tag "${REGISTRY}/${IMAGE_NAME}:${MINOR}" \
  --tag "${REGISTRY}/${IMAGE_NAME}:${MAJOR}" \
  --tag "${REGISTRY}/${IMAGE_NAME}:latest" \
  --push \
  .

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Release $NEW_VERSION completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  Version: ${YELLOW}$NEW_VERSION${NC}"
echo -e "  Tags pushed: ${YELLOW}${VERSION_NUMBER}, ${MINOR}, ${MAJOR}, latest${NC}"
echo -e "  Image: ${YELLOW}${REGISTRY}/${IMAGE_NAME}${NC}"
