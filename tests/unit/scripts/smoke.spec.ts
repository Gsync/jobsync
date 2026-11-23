import { describe, expect, it, vi } from "vitest";
import {
  CHECKS,
  SECURITY_HEADERS,
  exitCode,
  formatReport,
  runSmoke,
} from "../../../scripts/smoke.mjs";

const baseUrl = "http://127.0.0.1:3737";
const settings = { baseUrl, token: "test-token", expectedVersion: "1.2.1" };
const assetPath = "/_next/static/chunks/main.js";
const asset = `${assetPath}?dpl=test`;
const signinHtml = `<script src="${asset}"></script>`;
const signinHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

function healthyRoutes() {
  const redirect = () =>
    Response.redirect("http://localhost:3737/signin?callbackUrl=%2Fdashboard");

  return {
    "GET /signin": () => new Response(signinHtml, { headers: signinHeaders }),
    [`GET ${asset}`]: () => new Response(""),
    "GET /dashboard": redirect,
    "GET /api/version": redirect,
    "POST /api/v1/jobs": () => new Response(null, { status: 401 }),
    "GET /api/v1/ping": () => Response.json({ app: "jobsync", version: "1.2.1" }),
  } satisfies Record<string, () => Response>;
}

function fakeFetch(overrides: Record<string, () => Response> = {}) {
  const routes: Record<string, () => Response> = { ...healthyRoutes(), ...overrides };
  return vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    return routes[`${init?.method ?? "GET"} ${url.pathname}${url.search}`]();
  });
}

describe("post-deploy smoke checks", () => {
  it("passes a healthy build, including absolute sign-in redirects", async () => {
    const results = await runSmoke({ ...settings, fetch: fakeFetch() });

    expect(results.map(({ check }) => check)).toEqual(CHECKS);
    expect(results.map(({ status }) => status)).toEqual(Array(5).fill("pass"));
    expect(exitCode(results)).toBe(0);
    expect(formatReport(results).split("\n")).toHaveLength(5);
  });

  it.each([
    ["missing asset", `GET ${asset}`, () => new Response(null, { status: 404 }), "build-served", asset],
    ["no asset link", "GET /signin", () => new Response("<html></html>", { headers: signinHeaders }), "build-served", "no static asset linked"],
    ["asset in data-src", "GET /signin", () => new Response(`<script data-src="${assetPath}"></script>`, { headers: signinHeaders }), "build-served", "no static asset linked"],
    ["open dashboard", "GET /dashboard", () => new Response(""), "auth-wall", "/dashboard"],
    ["wrong redirect", "GET /api/version", () => Response.redirect(`${baseUrl}/dashboard`), "auth-wall", "/api/version"],
    ["unauthenticated POST rejected at validation", "POST /api/v1/jobs", () => new Response(null, { status: 400 }), "auth-wall", "401"],
    ["missing frame header", "GET /signin", () => new Response(signinHtml, { headers: { "X-Content-Type-Options": "nosniff" } }), "security-headers", "X-Frame-Options"],
    ["old release", "GET /api/v1/ping", () => Response.json({ app: "jobsync", version: "1.2.0" }), "release-version", "1.2.1"],
  ] as const)("reports only the affected check for %s", async (_fault, route, response, check, detail) => {
    const results = await runSmoke({ ...settings, fetch: fakeFetch({ [route]: response }) });

    expect(results.filter(({ status }) => status !== "pass")).toEqual([
      { check, status: "fail", detail: expect.stringContaining(detail) },
    ]);
    expect(exitCode(results)).toBe(1);
  });

  it("fails the token and release checks when ping fails", async () => {
    const fetch = fakeFetch({
      "GET /api/v1/ping": () => new Response(null, { status: 500 }),
    });
    const results = await runSmoke({ ...settings, fetch });

    expect(results.filter(({ status }) => status !== "pass")).toEqual([
      { check: "database-and-token", status: "fail", detail: expect.stringContaining("500") },
      { check: "release-version", status: "fail", detail: "no ping response" },
    ]);
  });

  it("skips both authenticated checks without a token", async () => {
    const fetch = fakeFetch();
    const results = await runSmoke({ baseUrl, expectedVersion: "1.2.1", fetch });

    expect(results.map(({ status }) => status)).toEqual(["pass", "pass", "pass", "skip", "skip"]);
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(exitCode(results)).toBe(0);
    expect(formatReport(results)).toContain("SMOKE_TOKEN not set");
  });

  it("skips only release verification without an expected version", async () => {
    const results = await runSmoke({ baseUrl, token: settings.token, fetch: fakeFetch() });

    expect(results.map(({ status }) => status)).toEqual(["pass", "pass", "pass", "pass", "skip"]);
    expect(results[4].detail).toBe("SMOKE_EXPECTED_VERSION not set");
  });

  it("reports a timeout when a request stalls", async () => {
    const respond = fakeFetch();
    const stalledFetch = vi.fn<typeof fetch>((input, init) => {
      if (new URL(String(input)).pathname !== assetPath) return respond(input, init);

      return new Promise((_resolve, reject) => {
        const signal = init?.signal;
        signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    });
    const results = await runSmoke({ ...settings, fetch: stalledFetch, timeoutMs: 50 });

    expect(results.filter(({ status }) => status !== "pass")).toEqual([
      { check: "build-served", status: "fail", detail: expect.stringContaining("timed out") },
    ]);
  });

  it("sends only reads and one unauthenticated, empty job POST", async () => {
    const fetch = fakeFetch();
    await runSmoke({ ...settings, fetch });

    const requests = fetch.mock.calls.map(([input, init]) => {
      expect(init?.redirect).toBe("manual");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return new Request(input, init);
    });
    const writes = requests.filter(({ method }) => method !== "GET");
    expect(writes).toHaveLength(1);
    expect(writes[0].method).toBe("POST");
    expect(new URL(writes[0].url).pathname).toBe("/api/v1/jobs");
    expect(writes[0].headers.has("Authorization")).toBe(false);
    expect(await writes[0].json()).toEqual({});

    const authenticated = requests.filter(({ headers }) => headers.has("Authorization"));
    expect(authenticated.map(({ url, headers }) => [new URL(url).pathname, headers.get("Authorization")]))
      .toEqual([["/api/v1/ping", "Bearer test-token"]]);
  });

  it("matches the global security headers in Next config", async () => {
    const { default: config } = await import("../../../next.config.mjs");
    const rules = await config.headers!();
    expect(
      SECURITY_HEADERS,
      "scripts/smoke.mjs and next.config.mjs headers() drifted apart",
    ).toEqual(Array.isArray(rules) ? rules.find(({ source }) => source === "/(.*)")?.headers : undefined);
  });
});
