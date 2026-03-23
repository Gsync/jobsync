#!/usr/bin/env bash
# Production build
source "$(dirname "$0")/env.sh"
pkill -f "next dev" 2>/dev/null
exec bun run build
