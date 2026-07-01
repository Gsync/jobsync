import { resolveMcpToken } from "@/lib/mcp/auth";
import { hashToken } from "@/lib/mcp/tokens";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    mcpAccessToken: { findUnique: vi.fn(), update: vi.fn() },
  };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});

// Build a minimal Request-like object rather than a real Headers instance,
// since Headers trims header values and would swallow the "Bearer " (empty
// token) case we need to exercise below.
function makeRequest(authHeader?: string): Request {
  return {
    headers: { get: (name: string) => (name === "authorization" ? authHeader ?? null : null) },
  } as unknown as Request;
}

describe("resolveMcpToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.mcpAccessToken.update as any).mockResolvedValue({});
  });

  it("rejects a missing Authorization header", async () => {
    const result = await resolveMcpToken(makeRequest());
    expect(result).toEqual({
      ok: false,
      status: 401,
      error: "Missing or malformed Authorization header",
    });
    expect(prisma.mcpAccessToken.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a malformed Authorization header (no Bearer prefix)", async () => {
    const result = await resolveMcpToken(makeRequest("Basic abc123"));
    expect(result).toEqual({
      ok: false,
      status: 401,
      error: "Missing or malformed Authorization header",
    });
  });

  it("rejects an empty bearer token", async () => {
    const result = await resolveMcpToken(makeRequest("Bearer    "));
    expect(result).toEqual({ ok: false, status: 401, error: "Empty token" });
  });

  it("rejects a token that doesn't match any record", async () => {
    (prisma.mcpAccessToken.findUnique as any).mockResolvedValue(null);

    const result = await resolveMcpToken(makeRequest("Bearer jsync_unknown"));

    expect(result).toEqual({ ok: false, status: 401, error: "Invalid token" });
  });

  it("rejects an expired token", async () => {
    (prisma.mcpAccessToken.findUnique as any).mockResolvedValue({
      id: "t-1",
      userId: "user-1",
      scopes: JSON.stringify(["jobs:write"]),
      name: "my-token",
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await resolveMcpToken(makeRequest("Bearer jsync_expired"));

    expect(result).toEqual({ ok: false, status: 401, error: "Token expired" });
  });

  it("rejects a token with malformed scopes JSON", async () => {
    (prisma.mcpAccessToken.findUnique as any).mockResolvedValue({
      id: "t-1",
      userId: "user-1",
      scopes: "{not-json",
      name: "my-token",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    const result = await resolveMcpToken(makeRequest("Bearer jsync_bad-scopes"));

    expect(result).toEqual({
      ok: false,
      status: 401,
      error: "Malformed token scopes",
    });
  });

  it("accepts a valid token and looks it up by its hash", async () => {
    const plaintext = "jsync_valid-token";
    (prisma.mcpAccessToken.findUnique as any).mockResolvedValue({
      id: "t-1",
      userId: "user-1",
      scopes: JSON.stringify(["jobs:write", "questions:write"]),
      name: "my-token",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    const result = await resolveMcpToken(makeRequest(`Bearer ${plaintext}`));

    expect(result).toEqual({
      ok: true,
      userId: "user-1",
      scopes: ["jobs:write", "questions:write"],
      tokenName: "my-token",
    });
    expect(prisma.mcpAccessToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashToken(plaintext) },
    });
  });

  it("updates lastUsedAt fire-and-forget on a valid token", async () => {
    (prisma.mcpAccessToken.findUnique as any).mockResolvedValue({
      id: "t-1",
      userId: "user-1",
      scopes: JSON.stringify([]),
      name: "my-token",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    await resolveMcpToken(makeRequest("Bearer jsync_valid"));

    expect(prisma.mcpAccessToken.update).toHaveBeenCalledWith({
      where: { id: "t-1" },
      data: { lastUsedAt: expect.any(Date) },
    });
  });

  it("does not reject the request if the lastUsedAt update fails", async () => {
    (prisma.mcpAccessToken.findUnique as any).mockResolvedValue({
      id: "t-1",
      userId: "user-1",
      scopes: JSON.stringify([]),
      name: "my-token",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });
    (prisma.mcpAccessToken.update as any).mockRejectedValue(new Error("db down"));

    const result = await resolveMcpToken(makeRequest("Bearer jsync_valid"));

    expect(result.ok).toBe(true);
  });
});
