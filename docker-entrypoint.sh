#!/bin/sh
set -e

# Auto-generate AUTH_SECRET if not provided
if [ -z "$AUTH_SECRET" ]; then
  export AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  echo "AUTH_SECRET was not set — generated a temporary secret for this container."
fi

# Resolve DATABASE_URL once for every step below. A separate assignment, so
# set -e sees a failure that `export VAR="$(...)"` would hide.
RESOLVED_DATABASE_URL="$(node scripts/dist/resolve-db-url.js)"
export DATABASE_URL="$RESOLVED_DATABASE_URL"

# Wait for Postgres; exits non-zero at once on a permanent misconfiguration
node scripts/dist/wait-for-db.js

# Apply the schema as root (before switching users)
npx -y prisma@6.19.0 migrate deploy

# One-time SQLite -> Postgres import. A no-op without a legacy dev.db, and it
# must finish before the server (and its scheduler) starts.
IMPORT_STATUS=0
node scripts/dist/import-sqlite.js || IMPORT_STATUS=$?
# Exit 2 is a finished dry run: idle, or the restart policy would repeat it
if [ "$IMPORT_STATUS" -eq 2 ]; then
  echo "Dry run finished. Remove IMPORT_DRY_RUN from .env and restart."
  trap 'exit 0' TERM INT
  while :; do sleep 3600 & wait $!; done
fi
[ "$IMPORT_STATUS" -eq 0 ] || exit "$IMPORT_STATUS"

# Fix /data permissions and run app as nextjs user
chown -R nextjs:nodejs /data
export HOME=/home/nextjs
exec su -s /bin/sh nextjs -c "HOSTNAME=0.0.0.0 PORT=${PORT:-3737} node server.js"
