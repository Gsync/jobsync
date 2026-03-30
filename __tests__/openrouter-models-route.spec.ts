jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/api-key-resolver", () => ({
  resolveApiKey: jest.fn(),
}));

// NextResponse.json uses Response.json() internally; provide a working implementation
jest.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

import { GET } from "@/app/api/ai/openrouter/models/route";
import { auth } from "@/auth";
import { resolveApiKey } from "@/lib/api-key-resolver";

describe("GET /api/ai/openrouter/models", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when no API key is configured", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (resolveApiKey as jest.Mock).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain("OpenRouter API key not configured");
  });

  it("returns model data on successful fetch", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (resolveApiKey as jest.Mock).mockResolvedValue("sk-or-valid");

    const mockModels = {
      data: [{ id: "openai/gpt-4o" }, { id: "google/gemini-flash" }],
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockModels,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockModels);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/models",
      { headers: { Authorization: "Bearer sk-or-valid" } },
    );
  });

  it("passes the resolved API key as a Bearer token", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (resolveApiKey as jest.Mock).mockResolvedValue("sk-or-my-key");
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await GET();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { Authorization: "Bearer sk-or-my-key" },
      }),
    );
  });

  it("returns the upstream status code when OpenRouter fetch fails", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (resolveApiKey as jest.Mock).mockResolvedValue("sk-or-valid");
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe("Failed to fetch OpenRouter models");
  });

  it("returns 500 on unexpected fetch error", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (resolveApiKey as jest.Mock).mockResolvedValue("sk-or-valid");
    global.fetch = jest.fn().mockRejectedValue(new Error("Network failure"));

    const response = await GET();

    expect(response.status).toBe(500);
  });

  it("handles missing session by passing undefined userId to resolveApiKey", async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    (resolveApiKey as jest.Mock).mockResolvedValue(undefined);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(resolveApiKey).toHaveBeenCalledWith(undefined, "openrouter");
  });

  it("resolves the API key using the authenticated user's id", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-42" } });
    (resolveApiKey as jest.Mock).mockResolvedValue(null);

    await GET();

    expect(resolveApiKey).toHaveBeenCalledWith("user-42", "openrouter");
  });
});
