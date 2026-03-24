#!/usr/bin/env bash
# Stop any running dev server, start fresh, wait for ready, verify HTTP response.
source "$(dirname "$0")/env.sh"

bash "$(dirname "$0")/stop.sh" 2>/dev/null
sleep 1

bash "$(dirname "$0")/dev.sh" &
DEV_PID=$!

echo "[dev-and-check] Waiting for server..."
for i in $(seq 1 20); do
  sleep 1
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3737 2>/dev/null)
  if [ "$CODE" != "000" ]; then
    echo "[dev-and-check] Server ready → HTTP $CODE (took ${i}s)"
    exit 0
  fi
done

echo "[dev-and-check] ERROR: Server did not respond within 20s"
exit 1
