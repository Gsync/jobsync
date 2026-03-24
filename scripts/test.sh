#!/usr/bin/env bash
# Run Jest tests using system Node.js (not bun — avoids readonly property bug)
source "$(dirname "$0")/env.sh"
export PATH="/run/current-system/sw/bin:$PATH"

echo "[test.sh] Using Node.js $(node --version)"
exec npx jest "$@"
