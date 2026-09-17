#!/usr/bin/env node
/**
 * Sync the single-file database (SQLite, Prisma-compatible) with a
 * Railway Bucket (S3-compatible object storage).
 *
 * Why not DuckDB as the engine: Prisma — the app's entire data layer
 * (100+ call sites) — has no DuckDB provider. Swapping engines means
 * rewriting every query. So the transactional DB stays SQLite-on-Prisma,
 * and durability moves from a Railway Volume to a Railway Bucket:
 * download on boot, upload on a timer + on shutdown.
 * `ponytail: file-level sync of main+wal+shm; per-row replication if multi-writer ever needed`
 *
 * Usage:
 *   node scripts/sync-db-bucket.mjs download [dbPath]
 *   node scripts/sync-db-bucket.mjs upload [dbPath]
 *
 * Env (Railway Bucket credentials tab / variable references):
 *   AWS_ENDPOINT_URL | S3_ENDPOINT            e.g. https://t3.storageapi.dev (required)
 *   AWS_ACCESS_KEY_ID | S3_ACCESS_KEY_ID      (required)
 *   AWS_SECRET_ACCESS_KEY | S3_SECRET_ACCESS_KEY (required)
 *   AWS_S3_BUCKET_NAME | BUCKET_NAME | S3_BUCKET (required)
 *   AWS_DEFAULT_REGION | S3_REGION             default "auto"
 *   S3_PATH_STYLE                             default "true" (set "false" for virtual-hosted style)
 *   DB_OBJECT_KEY                             default "db/<basename-of-db-file>"
 *   DATABASE_URL                              e.g. file:/data/dev.db (db path source)
 *
 * Exit 0 + skip message when the bucket is not configured (local dev).
 */

import { createHash, createHmac } from "node:crypto";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, basename } from "node:path";

const EMPTY_HASH =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

/** @param {Record<string, string | undefined>} env */
export function pick(env, ...names) {
  for (const n of names) {
    const v = env[n];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

/** @param {Record<string, string | undefined>} [env] */
export function getBucketConfig(env = process.env) {
  const endpoint = pick(env, "AWS_ENDPOINT_URL", "S3_ENDPOINT", "BUCKET_ENDPOINT");
  const accessKeyId = pick(env, "AWS_ACCESS_KEY_ID", "S3_ACCESS_KEY_ID", "BUCKET_ACCESS_KEY_ID");
  const secretAccessKey = pick(env, "AWS_SECRET_ACCESS_KEY", "S3_SECRET_ACCESS_KEY", "BUCKET_SECRET_ACCESS_KEY");
  const bucket = pick(env, "AWS_S3_BUCKET_NAME", "BUCKET_NAME", "S3_BUCKET", "S3_BUCKET_NAME");
  const region = pick(env, "AWS_DEFAULT_REGION", "S3_REGION", "BUCKET_REGION") ?? "auto";
  const pathStyle = (pick(env, "S3_PATH_STYLE") ?? "true").toLowerCase() !== "false";
  const configured = Boolean(endpoint && accessKeyId && secretAccessKey && bucket);
  return { endpoint, accessKeyId, secretAccessKey, bucket, region, pathStyle, configured };
}

export function resolveDbPath(databaseUrl, fallback = "/data/dev.db") {
  if (!databaseUrl) return fallback;
  const u = String(databaseUrl).trim();
  if (u.startsWith("file:")) return u.slice("file:".length) || fallback;
  return u || fallback;
}

/** @param {Record<string, string | undefined>} [env] */
export function dbObjectKey(dbPath, env = process.env) {
  return pick(env, "DB_OBJECT_KEY") ?? `db/${basename(dbPath)}`;
}

/** Files that make up one SQLite database (WAL mode = up to 3 files). */
export function dbSyncFiles(dbPath) {
  return [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];
}

function encodeKey(key) {
  return key.split("/").map((s) => encodeURIComponent(s)).join("/");
}

export function objectUrl(cfg, key) {
  const base = cfg.endpoint.replace(/\/+$/, "");
  return cfg.pathStyle
    ? `${base}/${cfg.bucket}/${encodeKey(key)}`
    : `${base.replace("://", `://${cfg.bucket}.`)}/${encodeKey(key)}`;
}

function amzDates(now = new Date()) {
  const iso = now.toISOString().replace(/[-:]|\.\d{3}/g, "");
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

function signingKey(secret, dateStamp, region) {
  const kDate = createHmac("sha256", `AWS4${secret}`).update(dateStamp).digest();
  const kRegion = createHmac("sha256", kDate).update(region).digest();
  const kService = createHmac("sha256", kRegion).update("s3").digest();
  return createHmac("sha256", kService).update("aws4_request").digest();
}

export function signS3Request({ method, url, payloadHash = EMPTY_HASH, cfg, now = new Date() }) {
  const { amzDate, dateStamp } = amzDates(now);
  const u = new URL(url);
  const canonicalUri = u.pathname;
  const canonicalQuery = u.searchParams.toString();
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonical =
    `${method}\n${canonicalUri}\n${canonicalQuery}\n` +
    `host:${u.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n\n` +
    `${signedHeaders}\n${payloadHash}`;
  const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${createHash("sha256").update(canonical).digest("hex")}`;
  const signature = createHmac("sha256", signingKey(cfg.secretAccessKey, dateStamp, cfg.region))
    .update(stringToSign)
    .digest("hex");
  return {
    Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
  };
}

async function s3Fetch(cfg, method, key, body) {
  const url = objectUrl(cfg, key);
  const payloadHash = body ? createHash("sha256").update(body).digest("hex") : EMPTY_HASH;
  const headers = {
    ...signS3Request({ method, url, payloadHash, cfg }),
    ...(body ? { "Content-Type": "application/octet-stream", "Content-Length": String(body.length) } : {}),
  };
  return fetch(url, { method, headers, body });
}

export async function s3Head(cfg, key) {
  const res = await s3Fetch(cfg, "HEAD", key);
  if (res.status === 200) return true;
  if (res.status === 404) return false;
  throw new Error(`S3 HEAD ${key} -> HTTP ${res.status}`);
}

export async function s3Get(cfg, key, destPath) {
  const res = await s3Fetch(cfg, "GET", key);
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`S3 GET ${key} -> HTTP ${res.status}`);
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
  return true;
}

export async function s3Put(cfg, key, srcPath) {
  const body = readFileSync(srcPath);
  const res = await s3Fetch(cfg, "PUT", key, body);
  if (!res.ok) throw new Error(`S3 PUT ${key} -> HTTP ${res.status}`);
  return true;
}

export async function s3Delete(cfg, key) {
  const res = await s3Fetch(cfg, "DELETE", key);
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`S3 DELETE ${key} -> HTTP ${res.status}`);
  return true;
}

export async function downloadDb(cfg, dbPath) {
  mkdirSync(dirname(dbPath), { recursive: true });
  let restored = false;
  for (const f of dbSyncFiles(dbPath)) {
    const key = dbObjectKey(f);
    if (await s3Get(cfg, key, f)) restored = true;
  }
  return restored;
}

export async function uploadDb(cfg, dbPath) {
  let uploaded = false;
  for (const f of dbSyncFiles(dbPath)) {
    if (!existsSync(f)) continue;
    await s3Put(cfg, dbObjectKey(f), f);
    uploaded = true;
  }
  return uploaded;
}

// --- CLI ---
const isMain = process.argv[1] && basename(process.argv[1]) === "sync-db-bucket.mjs";
if (isMain) {
  const mode = process.argv[2];
  const cfg = getBucketConfig();
  const dbPath = resolveDbPath(process.env.DATABASE_URL, process.argv[3] ?? "/data/dev.db");
  if (!cfg.configured) {
    console.log("bucket-sync: S3 bucket not configured — skipping.");
    process.exit(0);
  }
  if (mode !== "download" && mode !== "upload" && mode !== "delete") {
    console.error("usage: node scripts/sync-db-bucket.mjs download|upload|delete [dbPath|key]");
    process.exit(2);
  }
  try {
    if (mode === "download") {
      const restored = await downloadDb(cfg, dbPath);
      console.log(restored ? `bucket-sync: restored ${dbPath} from bucket.` : "bucket-sync: no object in bucket — fresh database.");
    } else if (mode === "delete") {
      const key = process.argv[3] ?? dbObjectKey(dbPath);
      const ok = await s3Delete(cfg, key);
      console.log(ok ? `bucket-sync: deleted ${key}.` : `bucket-sync: ${key} not found.`);
    } else {
      const ok = await uploadDb(cfg, dbPath);
      console.log(ok ? `bucket-sync: uploaded ${dbPath} to bucket.` : "bucket-sync: no local db file — nothing uploaded.");
    }
  } catch (err) {
    console.error(`bucket-sync: ${mode} failed: ${err.message}`);
    process.exit(1);
  }
}
