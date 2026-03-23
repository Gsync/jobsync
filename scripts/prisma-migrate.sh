#!/usr/bin/env bash
# Run Prisma migrations
source "$(dirname "$0")/env.sh"
exec bun run prisma migrate dev "$@"
