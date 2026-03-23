#!/usr/bin/env bash
# Stop dev server
pkill -f "next dev" 2>/dev/null && echo "Stopped" || echo "Not running"
