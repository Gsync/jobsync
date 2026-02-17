#!/bin/sh
set -e

# Auto-generate AUTH_SECRET if not provided
if [ -z "$AUTH_SECRET" ]; then
  export AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  echo "AUTH_SECRET was not set — generated a temporary secret for this container."
fi

# Run migrations as root (before switching users)
npx -y prisma@6.19.0 migrate deploy

# Fix /data permissions and run app as nextjs user
chown -R nextjs:nodejs /data
export HOME=/home/nextjs
exec su -s /bin/sh nextjs -c "node server.js"
