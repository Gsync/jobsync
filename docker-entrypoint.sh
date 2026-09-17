#!/bin/sh
set -e

# Auto-generate AUTH_SECRET if not provided
if [ -z "$AUTH_SECRET" ]; then
  export AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  echo "AUTH_SECRET was not set — generated a temporary secret for this container."
fi

# DB lives on a Railway Bucket (S3), not a Volume: restore before boot.
node /app/scripts/sync-db-bucket.mjs download || echo "bucket download skipped — fresh database."

# Run migrations as root (before switching users)
npx -y prisma@6.19.0 migrate deploy

# Periodically push the DB file back to the bucket (crash safety),
# plus a final push on shutdown.
(
  while true; do
    sleep 300
    node /app/scripts/sync-db-bucket.mjs upload || true
  done
) &
UPLOADER_PID=$!
trap 'kill $UPLOADER_PID 2>/dev/null; node /app/scripts/sync-db-bucket.mjs upload || true' TERM INT

# Fix /data permissions and run app as nextjs user
chown -R nextjs:nodejs /data
export HOME=/home/nextjs
exec su -s /bin/sh nextjs -c "HOSTNAME=0.0.0.0 PORT=${PORT:-3737} node server.js"
