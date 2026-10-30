---
type: how-to
title: Upgrading to Postgres
description: What changes when JobSync moves from SQLite to Postgres, what to do before upgrading, how the one-time import works, and how to recover if something goes wrong.
feature: setup
tags: [upgrade, postgres, sqlite, database, migration, import, docker, backup, restore, external database]
aliases: [upgrade to postgres, database migration, DATABASE_URL still points at SQLite, the database it was imported into appears to be missing, use my own postgres]
status: stable
stale_after: 2027-10-18
---

# Upgrading to Postgres

## What do I have to do to upgrade?

For the default setup, nothing beyond two checks before you run the update. JobSync now stores its data in Postgres, and a Postgres container is bundled and starts by itself. On the first start your existing data is copied across automatically.

Before updating:

1. **Move any edits you made to `docker-compose.yml` into `.env`.** If you set `ENCRYPTION_KEY`, `AUTH_SECRET`, `TZ` or `NEXTAUTH_URL` inside `docker-compose.yml`, copy each one into `.env` as `NAME=value`, and only then discard the edit with `git checkout -- docker-compose.yml`. Do not discard it first: without your `ENCRYPTION_KEY` in `.env`, saved API keys can no longer be read.
2. **Copy `jobsyncdb/data/dev.db` somewhere safe.** It is your complete fallback copy.

Then update as usual with the deploy script. If your `.env` still has an old `DATABASE_URL=file:...` line, the app ignores it, uses the bundled database and says so in its log; you can delete the line whenever you like.

## Is the upgrade reversible?

No, the upgrade is one-way and there is no supported way back to the SQLite release. A failed upgrade is fixed by correcting the cause and restarting. Your old `dev.db` is never written to, renamed or deleted, so the import can be retried from it as often as needed.

## What happens to my existing data?

It is copied into Postgres once, on the first start after the upgrade, before the app begins serving. Accounts, jobs, resumes, tags, API keys and MCP tokens all come across with the same ids, so you stay logged in. The log shows one line per table, such as `Job: 93 → 93 ✓`. Afterwards a small file, `jobsyncdb/data/dev.db.imported-at`, records that the import happened; leave it in place.

If your `dev.db` was last used by a release older than 1.1.22, the import stops before copying anything and prints one command to run. That command starts the last SQLite release once so it can bring `dev.db` up to date; press Ctrl+C when it reports it is ready, then start JobSync again.

## What do I do if the import fails?

Read the last lines of `docker compose logs app`, fix the cause it names, and restart. A failed import leaves Postgres empty and `dev.db` untouched, so restarting retries it from the start. To get into the app while you investigate, add `SKIP_IMPORT=1` to `.env` and restart; the app starts with no data. Remove that line again as soon as the cause is fixed. It is a one-time troubleshooting switch, not a setting.

To rehearse the import without writing anything, add `IMPORT_DRY_RUN=1`, restart, read the per-table summary in the log, then remove the line and restart.

## Why does the app say the database it was imported into appears to be missing?

Because Postgres is empty but your old `dev.db` was already imported earlier, which means the database volume was lost, or `DATABASE_URL` now points at a different, empty database. JobSync stops instead of quietly restoring months-old data. Restore a backup with `./restore-db.sh <file>`, or, to deliberately start again from the old SQLite data, delete `jobsyncdb/data/dev.db.imported-at` and restart.

## How do I back up JobSync now?

Run `./backup-db.sh`, which writes a dated dump into `jobsyncdb/data/backups/`. On Windows run it from WSL or Git Bash; there is no PowerShell version yet. The database no longer lives in the `jobsyncdb` folder, so a folder-level backup on its own no longer covers it; the dump puts a copy back inside that folder. On Linux you may need `sudo`, and the script says so when it does. Restore with `./restore-db.sh <file>`, which only loads into an empty database.

Copying Postgres's data directory while it is running is not a valid backup. The in-app Data Backup is still the way to move one account's data, but it leaves out accounts, API keys and MCP tokens, so it does not replace a dump. Take a dump before you ever delete `dev.db`.

## Where is my data stored now?

In a Docker volume named `jobsync_pgdata`, under Docker's own storage, not in `jobsyncdb/data/`. If you placed `jobsyncdb` on a particular disk on purpose, the database is no longer on it; to keep it there, declare the `pgdata` volume as a bind mount. Uploaded resume files stay in `jobsyncdb/data/` as before. The volume holds Postgres 18 data, so a future move to Postgres 19 is a dump and restore, not an image tag change.

## How do I use my own Postgres instead of the bundled one?

Set `DATABASE_URL` in `.env` to your server's address; never edit `docker-compose.yml`. That alone switches the app and the backup scripts to your server. Also add `BUNDLED_DB=0` to `.env`; without it an unused bundled database container still starts. Point `DATABASE_URL` at a dedicated, empty database. JobSync creates the database if it is missing and the role is allowed to; check the "created it" line on first start, because a typo in the name creates a new empty database rather than an error. Set `CREATE_DATABASE_IF_MISSING=0` to make a missing database an error instead. When a start-up message tells you to empty the Postgres database, drop and recreate that database on your server; the `docker volume rm` command it shows applies to the bundled database only.

Checklist for your server:

- Postgres 17 or newer.
- A role that can log in and either owns the database or has `GRANT ALL ON SCHEMA public`.
- Managed providers usually need `?sslmode=require`, and the direct endpoint rather than a pooled one.
- From inside the container use `host.docker.internal`, not `localhost`, for a Postgres on the same machine.
- Percent-encode a password containing `@`, `:`, `/` or `#`.
- If your server is newer than Postgres 18, set `PG_DUMP_IMAGE` in `.env` to its version, for example `postgres:19`, so backups work.
- Upcoming: a future release uses the `pgvector` extension for resume embeddings. If you run your own Postgres, plan to have it available; the bundled database already includes it.
