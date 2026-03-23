#!/usr/bin/env bash
# Generate Prisma client
source "$(dirname "$0")/env.sh"
exec bun run prisma generate
