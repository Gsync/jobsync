#!/bin/bash

# JobSync database restore
# Usage: ./restore-db.sh <backup-file.sql.gz>
# Loads a backup-db.sh dump into an EMPTY database. Refuses one with data.

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
    echo "Usage: ./restore-db.sh <backup-file.sql.gz>"
    echo "Backups are in jobsyncdb/data/backups/"
    exit 1
fi
FILE="$( cd "$( dirname "$FILE" )" && pwd )/$( basename "$FILE" )"
cd "$SCRIPT_DIR"

env_value() {
    [ -f .env ] || return 0
    { grep -E "^[[:space:]]*$1=" .env || true; } | tail -n 1 | cut -d= -f2- \
        | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}

if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo "Error: Docker Compose not found"
    exit 1
fi

BUNDLED_DB="$(env_value BUNDLED_DB)"
DATABASE_URL="$(env_value DATABASE_URL)"
PG_DUMP_IMAGE="$(env_value PG_DUMP_IMAGE)"
PG_DUMP_IMAGE="${PG_DUMP_IMAGE:-pgvector/pgvector:pg18}"
export DATABASE_URL

# A corrupt archive would otherwise feed psql empty input that "succeeds"
if ! gunzip -t "$FILE" 2>/dev/null; then
    echo "$FILE is not a readable gzip archive. Nothing was changed."
    exit 1
fi

# psql on stdin, in whichever mode .env selects. ON_ERROR_STOP is required:
# without it psql carries on past errors and still exits 0.
if [ "$BUNDLED_DB" = "0" ]; then
    if [ -z "$DATABASE_URL" ]; then
        echo "BUNDLED_DB=0 is set in .env but DATABASE_URL is not: there is no database to restore into."
        exit 1
    fi
    run_psql() {
        docker run --rm -i -e DATABASE_URL --add-host=host.docker.internal:host-gateway \
            "$PG_DUMP_IMAGE" sh -c 'psql -v ON_ERROR_STOP=1 "$@" "$DATABASE_URL"' sh "$@"
    }
else
    run_psql() { $COMPOSE_CMD exec -T db psql -v ON_ERROR_STOP=1 -U jobsync -d jobsync "$@"; }
fi

if ! HAS_TABLE="$(echo "SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User';" | run_psql -tA)"; then
    echo "Could not reach the database. Is it running? Nothing was changed."
    exit 1
fi
if [ "$HAS_TABLE" = "1" ]; then
    USERS="$(echo 'SELECT count(*) FROM "User";' | run_psql -tA)"
    if [ "$USERS" != "0" ]; then
        echo "This database already contains data ($USERS account(s)). Restore only loads into an empty database."
        echo "Nothing was changed. To replace live data on purpose, empty the database first."
        exit 1
    fi
fi

# The app is stopped so a restarting container cannot run migrations mid-load
echo "Stopping the app..."
$COMPOSE_CMD stop app

# A fresh volume already has the tables from migrate deploy, and a plain dump
# has no DROP statements, so the schema is reset before loading.
echo "Resetting the schema..."
if ! echo "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" | run_psql -q; then
    echo "Could not reset the public schema. On an external server the connecting role must own it."
    echo "The app is stopped. Fix the cause and re-run, or start it with: $COMPOSE_CMD start app"
    exit 1
fi

echo "Loading $FILE..."
# One transaction: a failed load rolls back to an empty schema, never half
if ! gunzip -c "$FILE" | run_psql -q -1 >/dev/null; then
    echo "Restore FAILED and was rolled back. The database is empty and the app is stopped."
    echo "Fix the cause and re-run this script."
    exit 1
fi

echo "Starting the app..."
$COMPOSE_CMD start app
echo "Restore complete."
