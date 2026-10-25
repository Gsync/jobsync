vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/api-key-resolver", () => ({ resolveApiKey: vi.fn() }));
vi.mock("@/lib/telemetry", () => ({ log: { error: vi.fn() } }));
vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

import { GET } from "@/app/api/ai/openai-compatible/models/route";
import { auth } from "@/auth";
import { resolveApiKey } from "@/lib/api-key-resolver";

describe("GET /api/ai/openai-compatible/models", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
  });

  it("returns 500 when no base URL is configured", async () => {
    (resolveApiKey as any).mockResolvedValue(undefined);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("base URL not configured");
  });

  it("lists models from the local /v1/models endpoint", async () => {
    (resolveApiKey as any).mockImplementation(
      async (_userId: string | undefined, provider: string) => {
        if (provider === "openai-compatible") return "http://127.0.0.1:1234/";
        if (provider === "openai-compatible-key") return "sk-local";
        return undefined;
      },
    );
    const mockModels = { data: [{ id: "local-model" }] };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockModels,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockModels);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:1234/v1/models",
      { headers: { Authorization: "Bearer sk-local" } },
    );
  });
});
