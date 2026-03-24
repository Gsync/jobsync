#!/usr/bin/env bash
# Setup Prisma engines for NixOS — downloads, patches, and verifies.
# Re-run this script whenever /tmp is cleared (reboot, tmpfiles cleanup).
set -euo pipefail

ENGINE_DIR="/tmp/prisma-engines"
COMMIT="2ba551f319ab1df4bc874a89965d8b3641056773"
DISTRO="debian-openssl-3.0.x"
BASE_URL="https://binaries.prisma.sh/all_commits/$COMMIT/$DISTRO"

# Check if engines already exist and work
if [ -f "$ENGINE_DIR/libquery_engine.so.node" ] && [ -f "$ENGINE_DIR/schema-engine" ]; then
  echo "[setup-prisma-engines] Engines already present at $ENGINE_DIR"
  exit 0
fi

echo "[setup-prisma-engines] Downloading Prisma engines (commit: ${COMMIT:0:12}...)"
mkdir -p "$ENGINE_DIR"

# Download engines
curl -sLo "$ENGINE_DIR/libquery_engine.so.node.gz" "$BASE_URL/libquery_engine.so.node.gz"
curl -sLo "$ENGINE_DIR/schema-engine.gz" "$BASE_URL/schema-engine.gz"

# Decompress
gunzip -f "$ENGINE_DIR/libquery_engine.so.node.gz"
gunzip -f "$ENGINE_DIR/schema-engine.gz"
chmod +x "$ENGINE_DIR/schema-engine"

echo "[setup-prisma-engines] Patching binaries for NixOS..."

# Find NixOS tools (use glob instead of find for speed)
PATCHELF=$(ls /nix/store/*patchelf*/bin/patchelf 2>/dev/null | head -1)
GLIBC_DIR=$(dirname "$(ls /nix/store/*glibc-2*/lib/ld-linux-x86-64.so.2 2>/dev/null | sort -V | tail -1)")
OPENSSL_DIR=$(dirname "$(ls /nix/store/*openssl-3*/lib/libssl.so.3 2>/dev/null | sort -V | tail -1)")

if [ -z "$PATCHELF" ] || [ -z "$GLIBC_DIR" ] || [ -z "$OPENSSL_DIR" ]; then
  echo "[setup-prisma-engines] ERROR: Could not find patchelf, glibc, or openssl in /nix/store"
  echo "  patchelf: $PATCHELF"
  echo "  glibc: $GLIBC_DIR"
  echo "  openssl: $OPENSSL_DIR"
  exit 1
fi

# Patch schema-engine (ELF binary)
$PATCHELF --set-interpreter "$GLIBC_DIR/ld-linux-x86-64.so.2" --set-rpath "$GLIBC_DIR:$OPENSSL_DIR" "$ENGINE_DIR/schema-engine"

# Patch libquery_engine (shared object)
$PATCHELF --set-rpath "$GLIBC_DIR:$OPENSSL_DIR" "$ENGINE_DIR/libquery_engine.so.node"

echo "[setup-prisma-engines] Verifying..."
if ldd "$ENGINE_DIR/schema-engine" 2>&1 | grep -q "not found"; then
  echo "[setup-prisma-engines] WARNING: Some libraries not found:"
  ldd "$ENGINE_DIR/schema-engine" 2>&1 | grep "not found"
else
  echo "[setup-prisma-engines] schema-engine: OK"
fi

if ldd "$ENGINE_DIR/libquery_engine.so.node" 2>&1 | grep -q "not found"; then
  echo "[setup-prisma-engines] WARNING: Some libraries not found:"
  ldd "$ENGINE_DIR/libquery_engine.so.node" 2>&1 | grep "not found"
else
  echo "[setup-prisma-engines] libquery_engine.so.node: OK"
fi

echo "[setup-prisma-engines] Done. Engines ready at $ENGINE_DIR"
