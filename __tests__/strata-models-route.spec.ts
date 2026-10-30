vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/api-key-resolver", () => ({
  resolveApiKey: vi.fn(),
}));

vi.mock("@/lib/telemetry", () => ({
  log: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// NextResponse.json uses Response.json() internally; provide a working implementation
vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

import { GET } from "@/app/api/ai/strata/models/route";
import { auth } from "@/auth";
import { resolveApiKey } from "@/lib/api-key-resolver";

describe("GET /api/ai/strata/models", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when there is no session", async () => {
    (auth as any).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
    expect(resolveApiKey).not.toHaveBeenCalled();
  });

  it("returns 401 when no base URL is configured", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (resolveApiKey as any).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain("Strata base URL not configured");
  });

  it("returns model data from the server's /v1/models endpoint", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (resolveApiKey as any).mockResolvedValue("http://127.0.0.1:8080");

    const mockModels = { data: [{ id: "qwen3.8-flash-next" }] };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockModels,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockModels);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/v1/models",
      expect.any(Object),
    );
  });

  it("strips a trailing slash from the base URL", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (resolveApiKey as any).mockResolvedValue("http://127.0.0.1:8080/");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await GET();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/v1/models",
      expect.any(Object),
    );
  });

  it("returns the upstream status code when the Strata fetch fails", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (resolveApiKey as any).mockResolvedValue("http://127.0.0.1:8080");
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe("Failed to fetch Strata models");
  });

  it("returns 502 when the server is unreachable", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (resolveApiKey as any).mockResolvedValue("http://127.0.0.1:8080");
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Cannot connect to Strata service");
  });

  it("resolves the base URL using the authenticated user's id", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-42" } });
    (resolveApiKey as any).mockResolvedValue(null);

    await GET();

    expect(resolveApiKey).toHaveBeenCalledWith("user-42", "strata");
  });
});
