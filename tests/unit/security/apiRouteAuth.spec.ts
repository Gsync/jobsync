// Structural guardrail for API route auth (root CLAUDE.md, Authentication).
// Flags departures, it does not prove auth: an auth() call and a 401 in the
// same handler do not show the 401 rejects the session. Runtime 401 checks
// stay in api-auth-contract.spec.ts.
// The proxy matcher's `(?!auth|mcp)` excludes any first segment that merely
// starts with those words, so a future /api/authors or /api/mcp-tokens
// route is unguarded by the proxy; this spec reports it as uncovered.
import fs from "node:fs";
import path from "node:path";
import {
  extractMatcher,
  routeUrls,
  scanProxyCoverage,
  scanRouteHandlers,
} from "./helpers/scanRoutes";
import { applyExceptions, ROUTE_EXCEPTIONS } from "./exceptions";

const API_DIR = path.join(process.cwd(), "src/app/api");
const PROXY_FILE = path.join(process.cwd(), "src/proxy.ts");
const REAL_MATCHER = ["/dashboard", "/dashboard/:path*", "/api/((?!auth|mcp).*)"];

function routeFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(full);
    return /^route\.[jt]sx?$/.test(entry.name) ? [full] : [];
  });
}

const rel = (full: string) => path.relative(process.cwd(), full).split(path.sep).join("/");
const routes = routeFiles(API_DIR).map(rel).sort();
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("scanRouteHandlers self-checks", () => {
  const file = "src/app/api/x/route.ts";

  it("passes a handler that calls auth() and returns 401", () => {
    const source = `
      export async function GET() {
        const session = await auth();
        if (!session) return NextResponse.json({}, { status: 401 });
      }`;
    expect(scanRouteHandlers(file, source)).toEqual([]);
  });

  it("flags a handler with no auth() call", () => {
    const source = `export async function GET() { return NextResponse.json({}, { status: 401 }); }`;
    expect(scanRouteHandlers(file, source)).toEqual([
      { file, target: "GET", check: "auth-call" },
    ]);
  });

  it("flags a handler that calls auth() but never returns 401", () => {
    const source = `export const POST = async () => { const s = await auth(); return new Response("x"); };`;
    expect(scanRouteHandlers(file, source)).toEqual([
      { file, target: "POST", check: "status-401" },
    ]);
  });

  it("ignores auth() and 401 in comments and in unrelated functions", () => {
    const source = `
      // const session = await auth(); { status: 401 }
      function helper() { auth(); return { status: 401 }; }
      export async function GET() { /* auth() */ return new Response("x"); }`;
    expect(scanRouteHandlers(file, source)).toEqual([
      { file, target: "GET", check: "auth-call" },
    ]);
  });

  it("reports an SSE handler that rejects with status 200 as missing 401", () => {
    const source = `
      function sseError(m: string) { return new NextResponse(m, { status: 200 }); }
      export async function GET() {
        const session = await auth();
        if (!session) return sseError("Not Authenticated");
      }`;
    expect(scanRouteHandlers(file, source)).toEqual([
      { file, target: "GET", check: "status-401" },
    ]);
  });

  it("resolves export specifiers to same-file functions", () => {
    const source = `
      async function handler() { const s = await auth(); return new Response("", { status: 401 }); }
      async function other() { return new Response("", { status: 405 }); }
      export { other as GET, handler as POST };`;
    expect(scanRouteHandlers(file, source)).toEqual([
      { file, target: "GET", check: "auth-call" },
    ]);
  });

  it("reports handlers it cannot resolve to a function body", () => {
    const source = `export const { GET, POST } = handlers; export const PUT = wrap(fn);`;
    expect(scanRouteHandlers(file, source)).toEqual([
      { file, target: "GET", check: "unresolved-handler" },
      { file, target: "POST", check: "unresolved-handler" },
      { file, target: "PUT", check: "unresolved-handler" },
    ]);
  });
});

describe("scanRouteHandlers re-export self-checks", () => {
  const file = "src/app/api/x/route.ts";

  it("reports re-exported handlers and a file with no handler", () => {
    expect(scanRouteHandlers(file, `export { GET, POST as PUT } from "@/lib/handlers";`)).toEqual([
      { file, target: "GET", check: "unresolved-handler" },
      { file, target: "PUT", check: "unresolved-handler" },
    ]);
    expect(scanRouteHandlers(file, `export * from "@/lib/handlers";`)).toEqual([
      { file, target: "*", check: "unresolved-handler" },
    ]);
    expect(scanRouteHandlers(file, `export const dynamic = "force-dynamic";`)).toEqual([
      { file, target: "(file)", check: "no-handler" },
    ]);
  });
});

describe("proxy coverage self-checks", () => {
  it("expands dynamic, catch-all and optional catch-all segments", () => {
    expect(routeUrls("src/app/api/automations/[id]/run/route.ts")).toEqual({
      urls: ["/api/automations/test-id/run"],
      unsupported: [],
    });
    expect(routeUrls("src/app/api/auth/[...nextauth]/route.ts").urls).toEqual([
      "/api/auth/test/path",
    ]);
    expect(routeUrls("src/app/api/x/[[...slug]]/route.ts").urls).toEqual([
      "/api/x",
      "/api/x/test/path",
    ]);
  });

  it("omits route groups and flags unsupported routing syntax", () => {
    expect(routeUrls("src/app/api/(group)/y/route.ts").urls).toEqual(["/api/y"]);
    expect(routeUrls("src/app/api/@slot/(.)z/_private/route.ts").unsupported).toEqual([
      "@slot",
      "(.)z",
      "_private",
    ]);
  });

  it("reports protected routes whose first segment collides with an excluded prefix", () => {
    const files = [
      "src/app/api/authors/route.ts",
      "src/app/api/mcp-tokens/route.ts",
      "src/app/api/jobs/export/route.ts",
    ];
    expect(scanProxyCoverage(files, REAL_MATCHER)).toEqual([
      { file: files[0], target: "/api/authors", check: "proxy-coverage" },
      { file: files[1], target: "/api/mcp-tokens", check: "proxy-coverage" },
    ]);
  });

  it("reports unsupported segments as findings rather than dropping the route", () => {
    expect(scanProxyCoverage(["src/app/api/@slot/route.ts"], REAL_MATCHER)).toEqual([
      { file: "src/app/api/@slot/route.ts", target: "@slot", check: "unsupported-segment" },
    ]);
  });

  it("extracts the matcher array without importing the proxy", () => {
    const source = `export const config = { matcher: ["/a", "/b/:path*"] };`;
    expect(extractMatcher(source)).toEqual(["/a", "/b/:path*"]);
    expect(() => extractMatcher(`export const config = { matcher: list };`)).toThrow();
    expect(() => extractMatcher(`const config = { matcher: ["/a"] };`)).toThrow();
  });
});

describe("applyExceptions self-checks", () => {
  const finding = { file: "f.ts", target: "GET", check: "status-401" };
  const exception = {
    ...finding,
    category: "contract-exception" as const,
    reason: "SSE error frame",
  };

  it("suppresses exactly the matching finding", () => {
    const other = { ...finding, target: "POST" };
    expect(applyExceptions([finding, other], [exception])).toEqual({
      unexcepted: [other],
      stale: [],
    });
  });

  it("fails an exception that matches no finding or several", () => {
    expect(applyExceptions([], [exception]).stale).toEqual([{ exception, matches: 0 }]);
    expect(applyExceptions([finding, finding], [exception]).stale).toEqual([
      { exception, matches: 2 },
    ]);
  });
});

describe("API routes in src/app/api", () => {
  const handlerFindings = routes.flatMap((file) => scanRouteHandlers(file, read(file)));
  const matcher = extractMatcher(read(rel(PROXY_FILE)));
  const proxyFindings = scanProxyCoverage(routes, matcher);
  const { unexcepted, stale } = applyExceptions(
    [...handlerFindings, ...proxyFindings],
    ROUTE_EXCEPTIONS,
  );

  it("finds the route files and the proxy matcher", () => {
    expect(routes.length).toBeGreaterThan(0);
    expect(matcher.length).toBeGreaterThan(0);
  });

  it("has no unreviewed auth or proxy-coverage findings", () => {
    expect(unexcepted).toEqual([]);
  });

  it("has no stale exceptions", () => {
    expect(stale).toEqual([]);
  });

  it("links every known gap to an issue note", () => {
    const gaps = ROUTE_EXCEPTIONS.filter((e) => e.category === "known-gap");
    expect(gaps.filter((e) => !e.issue)).toEqual([]);
  });
});
