import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  pick,
  getBucketConfig,
  resolveDbPath,
  dbObjectKey,
  dbSyncFiles,
  objectUrl,
  signS3Request,
  s3Head,
  s3Get,
  s3Put,
  downloadDb,
  uploadDb,
} from "../scripts/sync-db-bucket.mjs";

const CFG = {
  endpoint: "https://t3.storageapi.dev",
  accessKeyId: "AKIDEXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  bucket: "jobsync-db-xyz",
  region: "auto",
  pathStyle: false,
  configured: true,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pick", () => {
  it("returns first non-blank value", () => {
    expect(pick({ A: " ", B: "x" }, "A", "B")).toBe("x");
    expect(pick({}, "A", "B")).toBeUndefined();
  });
});

describe("getBucketConfig", () => {
  it("reads AWS_* names", () => {
    const cfg = getBucketConfig({
      AWS_ENDPOINT_URL: "https://t3.storageapi.dev",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      AWS_S3_BUCKET_NAME: "b",
      AWS_DEFAULT_REGION: "auto",
    });
    expect(cfg.configured).toBe(true);
    expect(cfg.bucket).toBe("b");
  });

  it("reads S3_* fallback names", () => {
    const cfg = getBucketConfig({
      S3_ENDPOINT: "https://t3.storageapi.dev",
      S3_ACCESS_KEY_ID: "id",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_BUCKET: "b",
    });
    expect(cfg.configured).toBe(true);
    expect(cfg.region).toBe("auto");
    expect(cfg.pathStyle).toBe(true);
  });

  it("reports not configured when anything is missing", () => {
    expect(getBucketConfig({}).configured).toBe(false);
    expect(
      getBucketConfig({ AWS_ENDPOINT_URL: "x", AWS_ACCESS_KEY_ID: "y" }).configured
    ).toBe(false);
  });
});

describe("resolveDbPath", () => {
  it("strips file: prefix", () => {
    expect(resolveDbPath("file:/data/dev.db")).toBe("/data/dev.db");
  });
  it("falls back when empty", () => {
    expect(resolveDbPath("")).toBe("/data/dev.db");
    expect(resolveDbPath(undefined)).toBe("/data/dev.db");
  });
});

describe("dbObjectKey / dbSyncFiles", () => {
  it("defaults to db/<basename>", () => {
    expect(dbObjectKey("/data/dev.db", {})).toBe("db/dev.db");
  });
  it("honours DB_OBJECT_KEY", () => {
    expect(dbObjectKey("/data/dev.db", { DB_OBJECT_KEY: "custom/key.db" })).toBe(
      "custom/key.db"
    );
  });
  it("covers WAL sidecars", () => {
    expect(dbSyncFiles("/data/dev.db")).toEqual([
      "/data/dev.db",
      "/data/dev.db-wal",
      "/data/dev.db-shm",
    ]);
  });
});

describe("objectUrl", () => {
  it("builds virtual-hosted URL when pathStyle is false", () => {
    expect(objectUrl(CFG, "db/dev.db")).toBe(
      "https://jobsync-db-xyz.t3.storageapi.dev/db/dev.db"
    );
  });
  it("builds path-style URL when pathStyle is true", () => {
    expect(objectUrl({ ...CFG, pathStyle: true }, "db/dev.db")).toBe(
      "https://t3.storageapi.dev/jobsync-db-xyz/db/dev.db"
    );
  });
});

describe("signS3Request", () => {
  const now = new Date("2026-09-17T12:00:00.000Z");
  it("is deterministic and well-formed", () => {
    const a = signS3Request({ method: "GET", url: objectUrl(CFG, "db/dev.db"), cfg: CFG, now });
    const b = signS3Request({ method: "GET", url: objectUrl(CFG, "db/dev.db"), cfg: CFG, now });
    expect(a).toEqual(b);
    expect(a.Authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/20260917\/auto\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/
    );
    expect(a["x-amz-date"]).toBe("20260917T120000Z");
  });
  it("varies with method", () => {
    const get = signS3Request({ method: "GET", url: objectUrl(CFG, "db/dev.db"), cfg: CFG, now });
    const put = signS3Request({ method: "PUT", url: objectUrl(CFG, "db/dev.db"), cfg: CFG, now });
    expect(get.Authorization).not.toBe(put.Authorization);
  });
});

function mockFetchOnce(status: number, body?: BodyInit) {
  const calls: { url: string; method: string; headers: Record<string, string> }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method ?? "GET", headers: init.headers as Record<string, string> });
      return new Response(body ?? null, { status });
    })
  );
  return calls;
}

describe("s3 operations (mocked fetch)", () => {
  it("s3Head true on 200, false on 404", async () => {
    mockFetchOnce(200);
    expect(await s3Head(CFG, "db/dev.db")).toBe(true);
    mockFetchOnce(404);
    expect(await s3Head(CFG, "db/dev.db")).toBe(false);
  });

  it("s3Get writes file on 200, returns false on 404", async () => {
    const dir = mkdtempSync(join(tmpdir(), "s3get-"));
    mockFetchOnce(200, "DB-BYTES");
    const dest = join(dir, "dev.db");
    expect(await s3Get(CFG, "db/dev.db", dest)).toBe(true);
    expect(readFileSync(dest, "utf8")).toBe("DB-BYTES");
    mockFetchOnce(404);
    expect(await s3Get(CFG, "db/missing.db", join(dir, "missing.db"))).toBe(false);
  });

  it("s3Put sends PUT to the object URL", async () => {
    const dir = mkdtempSync(join(tmpdir(), "s3put-"));
    const src = join(dir, "dev.db");
    const { writeFileSync } = await import("node:fs");
    writeFileSync(src, "DATA");
    const calls = mockFetchOnce(200);
    expect(await s3Put(CFG, "db/dev.db", src)).toBe(true);
    expect(calls[0].method).toBe("PUT");
    expect(calls[0].url).toBe("https://jobsync-db-xyz.t3.storageapi.dev/db/dev.db");
    expect(calls[0].headers.Authorization).toMatch(/^AWS4-HMAC-SHA256 /);
  });

  it("downloadDb restores main file; uploadDb skips missing sidecars", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sync-"));
    const db = join(dir, "app.db");
    const { writeFileSync } = await import("node:fs");
    // download: only main exists remotely — fetch mock answers per URL
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).endsWith("app.db")) return new Response("REMOTE", { status: 200 });
        return new Response(null, { status: 404 });
      })
    );
    expect(await downloadDb(CFG, db)).toBe(true);
    expect(readFileSync(db, "utf8")).toBe("REMOTE");

    // upload: only main exists locally
    const puts: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        if (init.method === "PUT") puts.push(String(url));
        return new Response(null, { status: 200 });
      })
    );
    writeFileSync(db, "LOCAL");
    expect(await uploadDb(CFG, db)).toBe(true);
    expect(puts).toHaveLength(1);
    expect(existsSync(`${db}-wal`)).toBe(false);
  });
});
