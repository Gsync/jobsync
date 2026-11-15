import { describe, it, expect, vi, beforeEach } from "vitest";
import packageJson from "../../../../../package.json";

vi.mock("@/lib/mcp/auth", () => ({ resolveMcpToken: vi.fn() }));
vi.mock("@/lib/mcp/rate-limit", () => ({ checkMcpRateLimit: vi.fn() }));
vi.mock("@/lib/telemetry", () => ({ log: { error: vi.fn() } }));

import { GET } from "@/app/api/v1/ping/route";
import { resolveMcpToken } from "@/lib/mcp/auth";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { log } from "@/lib/telemetry";

const resolveMock = vi.mocked(resolveMcpToken);

const SCOPES = ["jobs:write", "questions:write", "resume:write"];

function makeRequest() {
  return new Request("http://localhost/api/v1/ping", {
    headers: { authorization: "Bearer t" },
  });
}

function mockToken(scopes: string[]) {
  resolveMock.mockResolvedValue({
    ok: true,
    userId: "user-1",
    tokenName: "Chrome extension",
    scopes,
    expiresAt: new Date("2027-02-13T10:00:00.000Z"),
  });
}

describe("GET /api/v1/ping", () => {
  beforeEach(() => {
    resolveMock.mockReset();
  });

  it.each([
    "Missing or malformed Authorization header",
    "Invalid token",
    "Token expired",
  ])("returns 401 when the token lookup fails: %s", async (error) => {
    resolveMock.mockResolvedValue({ ok: false, status: 401, error });

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error });
  });

  it("returns 403 without jobs:write", async () => {
    mockToken(["questions:write"]);

    const res = await GET(makeRequest());

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "Token is missing the jobs:write scope",
    });
  });

  it("returns the ping body", async () => {
    mockToken(SCOPES);

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({
      app: "jobsync",
      version: packageJson.version,
      tokenName: "Chrome extension",
      tokenExpiresAt: "2027-02-13T10:00:00.000Z",
      scopes: SCOPES,
    });
  });

  it("never touches the rate limit", async () => {
    mockToken(SCOPES);
    await GET(makeRequest());
    resolveMock.mockResolvedValue({ ok: false, status: 401, error: "Invalid token" });
    await GET(makeRequest());

    expect(checkMcpRateLimit).not.toHaveBeenCalled();
  });

  it("returns a JSON 500 when the token lookup throws", async () => {
    resolveMock.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5"));

    const res = await GET(makeRequest());
    const text = await res.text();

    expect(res.status).toBe(500);
    expect(JSON.parse(text)).toEqual({ error: "Connection test failed" });
    expect(text).not.toContain("ECONNREFUSED");
    expect(log.error).toHaveBeenCalledTimes(1);
  });
});
