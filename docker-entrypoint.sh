#!/bin/sh
set -e

# Auto-generate AUTH_SECRET if not provided
if [ -z "$AUTH_SECRET" ]; then
  export AUTH_SECRET=$(openssl rand -base64 32)
  echo "AUTH_SECRET was not set — generated a temporary secret for this container."
fi

# Fix /data permissions and run app as nextjs user
chown -R nextjs:nodejs /data
exec su -s /bin/sh nextjs -c "npx -y prisma@6.19.0 migrate deploy && node server.js"
