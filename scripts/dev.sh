#!/usr/bin/env bash
# Start Next.js dev server
source "$(dirname "$0")/env.sh"
pkill -f "next dev" 2>/dev/null
sleep 1
exec bun run dev
