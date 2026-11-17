import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { APP_CONSTANTS } from "@/lib/constants";

describe("checkMcpRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request and reports MAX - 1 remaining", () => {
    const result = checkMcpRateLimit("user-fresh-1");
    expect(result).toEqual({
      allowed: true,
      remaining: APP_CONSTANTS.MCP_RATE_LIMIT_MAX - 1,
      resetIn: APP_CONSTANTS.MCP_RATE_LIMIT_WINDOW_MS,
    });
  });

  it("decrements remaining on each subsequent call within the window", () => {
    const userId = "user-fresh-2";
    checkMcpRateLimit(userId);
    const second = checkMcpRateLimit(userId);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(APP_CONSTANTS.MCP_RATE_LIMIT_MAX - 2);
  });

  it("denies once the count reaches MAX", () => {
    const userId = "user-fresh-3";
    for (let i = 0; i < APP_CONSTANTS.MCP_RATE_LIMIT_MAX; i++) {
      checkMcpRateLimit(userId);
    }
    const result = checkMcpRateLimit(userId);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetIn).toBeGreaterThan(0);
  });

  it("resets the count after the window elapses", () => {
    const userId = "user-fresh-4";
    for (let i = 0; i < APP_CONSTANTS.MCP_RATE_LIMIT_MAX; i++) {
      checkMcpRateLimit(userId);
    }
    expect(checkMcpRateLimit(userId).allowed).toBe(false);

    vi.advanceTimersByTime(APP_CONSTANTS.MCP_RATE_LIMIT_WINDOW_MS + 1);

    const result = checkMcpRateLimit(userId);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(APP_CONSTANTS.MCP_RATE_LIMIT_MAX - 1);
  });

  it("tracks separate users independently", () => {
    const a = "user-fresh-5a";
    const b = "user-fresh-5b";
    for (let i = 0; i < APP_CONSTANTS.MCP_RATE_LIMIT_MAX; i++) {
      checkMcpRateLimit(a);
    }
    expect(checkMcpRateLimit(a).allowed).toBe(false);
    expect(checkMcpRateLimit(b).allowed).toBe(true);
  });
});
