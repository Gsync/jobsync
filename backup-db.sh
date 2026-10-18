#!/bin/bash

# JobSync database backup
# Usage: ./backup-db.sh
# Writes jobsyncdb/data/backups/jobsync-YYYY-MM-DD-HHMM.sql.gz

# pipefail matters: without it a failed pg_dump still lets gzip exit 0 and
# leaves a dated, valid, empty archive that looks like a backup.
set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Last uncommented NAME=value line in .env, with surrounding quotes removed
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

BACKUP_DIR="jobsyncdb/data/backups"
if ! mkdir -p "$BACKUP_DIR" 2>/dev/null || [ ! -w "$BACKUP_DIR" ]; then
    echo "Cannot write to $BACKUP_DIR. The app container owns jobsyncdb/data; re-run with sudo."
    exit 1
fi

# Dump to a temporary name; only a complete dump gets a dated file name
TMP="$(mktemp "$BACKUP_DIR/.jobsync-dump.XXXXXX")"
ERR="$(mktemp)"
trap 'rm -f "$TMP" "$ERR"' EXIT

# The app's rule: unset, a leftover file: or host db all mean bundled
db_mode() {
    case "$DATABASE_URL" in
        postgres://*|postgresql://*) ;;
        *) echo bundled; return ;;
    esac
    local host="${DATABASE_URL#*://}"
    host="${host%%/*}"
    host="${host##*@}"
    host="${host%%:*}"
    if [ "$host" = "db" ]; then echo bundled; else echo external; fi
}

if [ "$(db_mode)" = "external" ]; then
    echo "Backing up the external database with $PG_DUMP_IMAGE..."
    # pg_dump comes from a container: a Docker-only host has no client tools
    dump() {
        docker run --rm -e DATABASE_URL --add-host=host.docker.internal:host-gateway \
            "$PG_DUMP_IMAGE" sh -c 'pg_dump "$DATABASE_URL"'
    }
else
    if [ "$BUNDLED_DB" = "0" ]; then
        echo "BUNDLED_DB=0 is set in .env but DATABASE_URL does not point at your own Postgres: there is no database to back up."
        exit 1
    fi
    echo "Backing up the bundled database..."
    dump() { $COMPOSE_CMD exec -T db pg_dump -U jobsync jobsync; }
fi

if ! dump 2>"$ERR" | gzip > "$TMP"; then
    echo "Backup FAILED. No backup file was written."
    cat "$ERR"
    if grep -qi "server version mismatch" "$ERR"; then
        echo ""
        echo "Your Postgres server is newer than the dump tool. Set PG_DUMP_IMAGE in .env"
        echo "to an image of the server's major version, for example PG_DUMP_IMAGE=postgres:19."
    fi
    exit 1
fi

OUT="$BACKUP_DIR/jobsync-$(date +%F-%H%M).sql.gz"
mv "$TMP" "$OUT"
echo "Backup written to $OUT ($(du -h "$OUT" | cut -f1))"
