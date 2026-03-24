#!/usr/bin/env bash
# Shared environment for all jobsync scripts (NixOS workarounds)
source ~/.bash_profile 2>/dev/null

# Auto-setup Prisma engines if missing (survives /tmp clears)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ ! -f /tmp/prisma-engines/libquery_engine.so.node ]; then
  echo "[env.sh] Prisma engines missing — running setup..."
  bash "$SCRIPT_DIR/setup-prisma-engines.sh"
fi

export PRISMA_SCHEMA_ENGINE_BINARY=/tmp/prisma-engines/schema-engine
export PRISMA_QUERY_ENGINE_LIBRARY=/tmp/prisma-engines/libquery_engine.so.node
export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
