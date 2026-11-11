#!/bin/sh
set -e

# Stop a still-SQLite instance before anything touches the database: this
# release has no import. 1.2.0 writes the sentinel after a finished import.
SQLITE_LEGACY_PATH="${SQLITE_LEGACY_PATH:-/data/dev.db}"
if [ -e "$SQLITE_LEGACY_PATH" ] && [ ! -e "$SQLITE_LEGACY_PATH.imported-at" ]; then
  cat <<EOF
Found a SQLite database at $SQLITE_LEGACY_PATH that was never imported into Postgres.
This release cannot import a SQLite database. Nothing has been modified.

Already using this instance on Postgres, or don't need the old data?
  Create an empty file named dev.db.imported-at next to dev.db
  (jobsyncdb/data/ on the host), then restart.

Still on SQLite and want to keep your data? Run 1.2.0 once to import it:
  docker compose -f docker-compose.yml -f docker-compose.sqlite-import.yml up -d
  Wait until the app loads, then run ./deploy.sh
  (or docker compose pull && docker compose up -d).

See https://github.com/Gsync/jobsync/wiki/Upgrading-To-Postgres
EOF
  # Idle, or the restart policy would repeat this until someone stops it
  trap 'exit 0' TERM INT
  while :; do sleep 3600 & wait $!; done
fi

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

# Fix /data permissions and run app as nextjs user
chown -R nextjs:nodejs /data
export HOME=/home/nextjs
exec su -s /bin/sh nextjs -c "HOSTNAME=0.0.0.0 PORT=${PORT:-3737} node server.js"
