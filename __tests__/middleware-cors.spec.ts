/**
 * Tests for CORS middleware and ALLOWED_DEV_ORIGINS handling.
 *
 * The middleware (src/middleware.ts) adds CORS headers to responses
 * when NODE_ENV=development and the request Origin matches one of
 * the comma-separated values in ALLOWED_DEV_ORIGINS.
 */

// ---------------------------------------------------------------------------
// Mock next/server — NextRequest and NextResponse stubs
// ---------------------------------------------------------------------------

class MockHeaders {
  private map = new Map<string, string>();

  set(name: string, value: string) {
    this.map.set(name.toLowerCase(), value);
  }

  get(name: string): string | null {
    return this.map.get(name.toLowerCase()) ?? null;
  }

  has(name: string): boolean {
    return this.map.has(name.toLowerCase());
  }

  delete(name: string) {
    this.map.delete(name.toLowerCase());
  }
}

class MockNextRequest {
  headers: MockHeaders;
  method: string;
  url: string;
  nextUrl: URL;

  constructor(
    url: string | URL,
    init?: { headers?: Record<string, string>; method?: string }
  ) {
    this.url = typeof url === "string" ? url : url.toString();
    this.nextUrl = typeof url === "string" ? new URL(url) : url;
    this.method = init?.method ?? "GET";
    this.headers = new MockHeaders();
    if (init?.headers) {
      for (const [k, v] of Object.entries(init.headers)) {
        this.headers.set(k, v);
      }
    }
  }
}

class MockNextResponse {
  headers: MockHeaders;
  status: number;

  constructor(body?: unknown, init?: { status?: number }) {
    this.headers = new MockHeaders();
    this.status = init?.status ?? 200;
  }

  static next() {
    return new MockNextResponse();
  }
}

jest.mock("next/server", () => ({
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse,
}));

// Mock NextAuth — the auth handler resolves to null (no redirect/rewrite)
jest.mock("next-auth", () => {
  const authFn = jest.fn().mockResolvedValue(null);
  return {
    __esModule: true,
    default: jest.fn(() => ({ auth: authFn })),
  };
});

jest.mock("@/auth.config", () => ({
  authConfig: {},
}));

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

const originalEnv = { ...process.env };

beforeEach(() => {
  jest.clearAllMocks();
  // Default to development mode for most tests
  process.env.NODE_ENV = "development";
  delete process.env.ALLOWED_DEV_ORIGINS;
});

afterEach(() => {
  // Restore process.env to original state
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, originalEnv);
  jest.resetModules();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Helper: create a mock request with an optional Origin header.
 */
function makeRequest(origin?: string, method = "GET"): InstanceType<typeof MockNextRequest> {
  const headers: Record<string, string> = {};
  if (origin) {
    headers["origin"] = origin;
  }
  return new MockNextRequest(new URL("http://localhost:3737/dashboard"), {
    headers,
    method,
  });
}

/**
 * Helper: create an OPTIONS preflight request.
 */
function makePreflightRequest(origin: string): InstanceType<typeof MockNextRequest> {
  return makeRequest(origin, "OPTIONS");
}

/**
 * Dynamically import the middleware (fresh module for each test).
 */
async function getMiddleware() {
  const mod = await import("@/middleware");
  return mod.default;
}

// ---------------------------------------------------------------------------
// ALLOWED_DEV_ORIGINS is SET
// ---------------------------------------------------------------------------
describe("CORS middleware — ALLOWED_DEV_ORIGINS is set", () => {
  it("adds CORS headers when Origin matches an allowed origin", async () => {
    process.env.NODE_ENV = "development";
    process.env.ALLOWED_DEV_ORIGINS = "http://localhost:4000";

    const middleware = await getMiddleware();
    const request = makeRequest("http://localhost:4000");
    const response = await middleware(request as any);

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:4000"
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type, Authorization"
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
      "true"
    );
  });

  it("does NOT add CORS headers when Origin does not match", async () => {
    process.env.NODE_ENV = "development";
    process.env.ALLOWED_DEV_ORIGINS = "http://localhost:4000";

    const middleware = await getMiddleware();
    const request = makeRequest("http://evil.example.com");
    const response = await middleware(request as any);

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Methods")).toBeNull();
  });

  it("handles multiple comma-separated origins correctly", async () => {
    process.env.NODE_ENV = "development";
    process.env.ALLOWED_DEV_ORIGINS =
      "http://localhost:4000, http://192.168.1.50:3737, http://myhost.ts.net:3737";

    const middleware = await getMiddleware();

    // First origin
    const r1 = makeRequest("http://localhost:4000");
    const res1 = await middleware(r1 as any);
    expect(res1.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:4000"
    );

    // Second origin
    const r2 = makeRequest("http://192.168.1.50:3737");
    const res2 = await middleware(r2 as any);
    expect(res2.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://192.168.1.50:3737"
    );

    // Third origin
    const r3 = makeRequest("http://myhost.ts.net:3737");
    const res3 = await middleware(r3 as any);
    expect(res3.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://myhost.ts.net:3737"
    );

    // Non-matching origin
    const r4 = makeRequest("http://unknown:9999");
    const res4 = await middleware(r4 as any);
    expect(res4.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("returns response with CORS headers for OPTIONS preflight requests", async () => {
    process.env.NODE_ENV = "development";
    process.env.ALLOWED_DEV_ORIGINS = "http://localhost:4000";

    const middleware = await getMiddleware();
    const request = makePreflightRequest("http://localhost:4000");
    const response = await middleware(request as any);

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:4000"
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "OPTIONS"
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
      "true"
    );
  });
});

// ---------------------------------------------------------------------------
// ALLOWED_DEV_ORIGINS is NOT SET
// ---------------------------------------------------------------------------
describe("CORS middleware — ALLOWED_DEV_ORIGINS is not set", () => {
  it("does NOT add CORS headers when ALLOWED_DEV_ORIGINS is undefined", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.ALLOWED_DEV_ORIGINS;

    const middleware = await getMiddleware();
    const request = makeRequest("http://localhost:4000");
    const response = await middleware(request as any);

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("passes through normally when no Origin header is present", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.ALLOWED_DEV_ORIGINS;

    const middleware = await getMiddleware();
    const request = makeRequest(); // no origin
    const response = await middleware(request as any);

    // Should still return a valid response (NextResponse.next())
    expect(response).toBeDefined();
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe("CORS middleware — edge cases", () => {
  it("treats empty ALLOWED_DEV_ORIGINS string as not set", async () => {
    process.env.NODE_ENV = "development";
    process.env.ALLOWED_DEV_ORIGINS = "";

    const middleware = await getMiddleware();
    const request = makeRequest("http://localhost:4000");
    const response = await middleware(request as any);

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("matches origins with ports correctly", async () => {
    process.env.NODE_ENV = "development";
    process.env.ALLOWED_DEV_ORIGINS = "http://localhost:4000";

    const middleware = await getMiddleware();

    // Exact match with port
    const r1 = makeRequest("http://localhost:4000");
    const res1 = await middleware(r1 as any);
    expect(res1.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:4000"
    );

    // Different port — should NOT match
    // "http://localhost:5000".includes("http://localhost:4000") is false
    // "http://localhost:4000".includes("http://localhost:5000") is false
    const r2 = makeRequest("http://localhost:5000");
    const res2 = await middleware(r2 as any);
    expect(res2.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("matches origin without port when allowed origin has no port", async () => {
    process.env.NODE_ENV = "development";
    process.env.ALLOWED_DEV_ORIGINS = "http://localhost";

    const middleware = await getMiddleware();

    // Origin without port matches allowed origin without port
    const r1 = makeRequest("http://localhost");
    const res1 = await middleware(r1 as any);
    expect(res1.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost"
    );

    // Origin with port — the middleware uses substring matching:
    // "http://localhost:3737".includes("http://localhost") is true
    const r2 = makeRequest("http://localhost:3737");
    const res2 = await middleware(r2 as any);
    expect(res2.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:3737"
    );
  });

  it("does NOT add CORS headers in production mode", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOWED_DEV_ORIGINS = "http://localhost:4000";

    const middleware = await getMiddleware();
    const request = makeRequest("http://localhost:4000");
    const response = await middleware(request as any);

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Methods")).toBeNull();
  });

  it("handles whitespace-only entries in comma-separated origins", async () => {
    process.env.NODE_ENV = "development";
    process.env.ALLOWED_DEV_ORIGINS =
      "http://localhost:4000,  , ,http://other:3000";

    const middleware = await getMiddleware();

    // Valid origin still matches
    const r1 = makeRequest("http://localhost:4000");
    const res1 = await middleware(r1 as any);
    expect(res1.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:4000"
    );

    // Second valid origin matches
    const r2 = makeRequest("http://other:3000");
    const res2 = await middleware(r2 as any);
    expect(res2.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://other:3000"
    );
  });

  it("does not add CORS headers when ALLOWED_DEV_ORIGINS has only spaces", async () => {
    process.env.NODE_ENV = "development";
    process.env.ALLOWED_DEV_ORIGINS = "   ,  , ";

    const middleware = await getMiddleware();
    const request = makeRequest("http://localhost:4000");
    const response = await middleware(request as any);

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
