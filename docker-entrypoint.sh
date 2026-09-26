#!/bin/sh
set -e

generate_or_load_secret() {
  variable_name="$1"
  file_path="$2"

  eval "current_value=\${$variable_name:-}"
  if [ -n "$current_value" ]; then
    return
  fi

  if [ -s "$file_path" ]; then
    value=$(cat "$file_path")
  else
    value=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
    umask 077
    printf '%s\n' "$value" > "$file_path"
    echo "$variable_name was not set — generated and persisted a value in $file_path."
  fi

  export "$variable_name=$value"
}

# Both values are stored on the mounted /data volume when not supplied. Users
# with an existing deployment can continue to provide them through .env.
generate_or_load_secret AUTH_SECRET /data/.auth_secret
generate_or_load_secret ENCRYPTION_KEY /data/.encryption_key

# Run migrations as root (before switching users)
npx -y prisma@6.19.0 migrate deploy

# Fix /data permissions and run app as nextjs user
chown -R nextjs:nodejs /data
export HOME=/home/nextjs
exec su -s /bin/sh nextjs -c "HOSTNAME=0.0.0.0 PORT=${PORT:-3737} node server.js"
