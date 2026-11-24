import { pathToFileURL } from "node:url";

export const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
];

export const CHECKS = [
  "build-served",
  "auth-wall",
  "security-headers",
  "database-and-token",
  "release-version",
];

/** @typedef {{ check: string, status: "pass" | "fail" | "skip", detail: string }} Result */

/** @returns {Promise<Result>} */
async function checkSmoke(check, probe) {
  try {
    return { check, status: "pass", detail: await probe() };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { check, status: "fail", detail: error?.name === "TimeoutError" ? "timed out" : detail };
  }
}

function expectStatus(response, path, expected) {
  if (response.status !== expected) {
    throw new Error(`${path} returned ${response.status}, expected ${expected}`);
  }
}

/**
 * @param {{ baseUrl: string, token?: string, expectedVersion?: string,
 *   fetch?: typeof globalThis.fetch, timeoutMs?: number }} options
 * @returns {Promise<Result[]>}
 */
export async function runSmoke({
  baseUrl,
  token,
  expectedVersion,
  fetch = globalThis.fetch,
  timeoutMs = 10_000,
}) {
  /** @param {string} path @param {RequestInit} [init] */
  const request = (path, init) => fetch(new URL(path, baseUrl), {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });

  let signin;
  const build = await checkSmoke("build-served", async () => {
    signin = await request("/signin");
    expectStatus(signin, "/signin", 200);
    const html = await signin.text();
    const asset = html.match(/<(?:script\b[^>]*?\ssrc|link\b[^>]*?\shref)\s*=\s*["'](\/_next\/static\/[^"'\s?#]+\.(?:js|css)(?:\?[^"'\s#]*)?)(?:#[^"'\s]*)?["']/i)?.[1];
    if (!asset) throw new Error("no static asset linked");

    const response = await request(asset);
    expectStatus(response, asset, 200);
    return `/signin links a served asset (${asset})`;
  });

  const auth = await checkSmoke("auth-wall", async () => {
    for (const path of ["/dashboard", "/api/version"]) {
      const response = await request(path);
      const location = response.headers.get("Location");
      if (response.status < 300 || response.status >= 400 ||
          !location || new URL(location, baseUrl).pathname !== "/signin") {
        throw new Error(`${path} returned ${response.status}, expected a redirect to /signin (src/proxy.ts)`);
      }
    }

    const response = await request("/api/v1/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expectStatus(response, "unauthenticated POST /api/v1/jobs", 401);
    return "protected routes redirect to /signin and v1 jobs requires a token";
  });

  const headers = await checkSmoke("security-headers", async () => {
    if (!signin) throw new Error("no /signin response");
    for (const { key, value } of SECURITY_HEADERS) {
      if (signin.headers.get(key) !== value) {
        throw new Error(`/signin requires ${key}: ${value} (next.config.mjs)`);
      }
    }
    return "/signin includes both security headers";
  });

  let ping;
  const database = token
    ? await checkSmoke("database-and-token", async () => {
        const response = await request("/api/v1/ping", {
          headers: { Authorization: `Bearer ${token}` },
        });
        expectStatus(response, "/api/v1/ping", 200);
        ping = await response.json();
        if (ping?.app !== "jobsync") {
          throw new Error('/api/v1/ping requires app "jobsync"');
        }
        return "/api/v1/ping authenticated successfully";
      })
    : { check: "database-and-token", status: "skip", detail: "SMOKE_TOKEN not set" };

  const skipVersion = !token ? "SMOKE_TOKEN not set" :
    !expectedVersion ? "SMOKE_EXPECTED_VERSION not set" : undefined;
  const release = skipVersion
    ? { check: "release-version", status: "skip", detail: skipVersion }
    : await checkSmoke("release-version", async () => {
        if (database.status !== "pass") throw new Error("no ping response");
        if (ping.version !== expectedVersion) {
          throw new Error(`/api/v1/ping reported version ${ping.version}, expected ${expectedVersion} (package.json)`);
        }
        return `version ${expectedVersion}`;
      });

  return [build, auth, headers, database, release];
}

/** @param {Result[]} results */
export function formatReport(results) {
  return results.map(({ check, status, detail }) => `${status} ${check}: ${detail}`).join("\n");
}

/** @param {Result[]} results */
export function exitCode(results) {
  return results.some(({ status }) => status === "fail") ? 1 : 0;
}

async function main() {
  const results = await runSmoke({
    baseUrl: process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3737",
    token: process.env.SMOKE_TOKEN,
    expectedVersion: process.env.SMOKE_EXPECTED_VERSION,
  });
  console.log(formatReport(results));
  process.exitCode = exitCode(results);
}

if (process.argv[1] === "-" ||
    (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)) {
  await main();
}
