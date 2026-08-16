import { authorizeIntegrationRead } from "@/lib/jobs/integrationRoute";
import { resolveMcpToken } from "@/lib/mcp/auth";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";

vi.mock("@/lib/mcp/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mcp/auth")>();
  return { ...actual, resolveMcpToken: vi.fn() };
});

vi.mock("@/lib/mcp/rate-limit", () => ({
  checkMcpRateLimit: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
      json: async () => data,
    }),
  },
}));

const req = {} as Request;

describe("integration jobs bearer authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkMcpRateLimit as any).mockReturnValue({
      allowed: true,
      remaining: 59,
      resetIn: 60_000,
    });
  });

  it("returns token authentication failures unchanged", async () => {
    (resolveMcpToken as any).mockResolvedValue({
      ok: false,
      status: 401,
      error: "Invalid token",
    });

    const result = await authorizeIntegrationRead(req);

    expect("response" in result).toBe(true);
    if (!("response" in result)) throw new Error("Expected error response");
    const response = result.response;
    if (!response) throw new Error("Expected error response");
    expect(response.status).toBe(401);
    expect(checkMcpRateLimit).not.toHaveBeenCalled();
  });

  it.each([["jobs:read"], ["jobs:write"]])(
    "accepts compatible scope %s",
    async (scope) => {
      (resolveMcpToken as any).mockResolvedValue({
        ok: true,
        userId: "user-1",
        scopes: [scope],
        tokenName: "token",
      });

      await expect(authorizeIntegrationRead(req)).resolves.toEqual({ userId: "user-1" });
      expect(checkMcpRateLimit).toHaveBeenCalledWith("user-1");
    },
  );

  it("rejects unrelated scopes", async () => {
    (resolveMcpToken as any).mockResolvedValue({
      ok: true,
      userId: "user-1",
      scopes: ["questions:write"],
      tokenName: "token",
    });

    const result = await authorizeIntegrationRead(req);

    expect("response" in result).toBe(true);
    if (!("response" in result)) throw new Error("Expected error response");
    const response = result.response;
    if (!response) throw new Error("Expected error response");
    expect(response.status).toBe(403);
    expect(checkMcpRateLimit).not.toHaveBeenCalled();
  });

  it("applies the existing user-scoped MCP rate limit", async () => {
    (resolveMcpToken as any).mockResolvedValue({
      ok: true,
      userId: "user-1",
      scopes: ["jobs:read"],
      tokenName: "token",
    });
    (checkMcpRateLimit as any).mockReturnValue({
      allowed: false,
      remaining: 0,
      resetIn: 1_500,
    });

    const result = await authorizeIntegrationRead(req);

    expect("response" in result).toBe(true);
    if (!("response" in result)) throw new Error("Expected error response");
    const response = result.response;
    if (!response) throw new Error("Expected error response");
    expect(response.status).toBe(429);
    expect(response.headers).toEqual({ "Retry-After": "2" });
  });
});
