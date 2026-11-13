// Tests for POST /api/settings/api-keys/verify: validation, provider lookup,
// verifier success, and connection-error message shaping.

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

const mockVerifier = vi.fn();
vi.mock("@/lib/ai/provider-registry.server", () => ({
  PROVIDER_VERIFIERS: {
    get openai() {
      return mockVerifier;
    },
  },
}));

import { POST } from "@/app/api/settings/api-keys/verify/route";
import { auth } from "@/auth";

const authed = () =>
  (auth as any).mockResolvedValue({ user: { id: "user-1" } });
const req = (body: unknown) => ({ json: async () => body }) as any;

describe("POST /api/settings/api-keys/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
  });

  it("returns 400 when provider or key is missing", async () => {
    const res = await POST(req({ provider: "openai" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("required");
  });

  it("returns 400 for an unknown provider", async () => {
    const res = await POST(req({ provider: "nope", key: "k" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Unknown provider");
  });

  it("returns the verifier result on success", async () => {
    mockVerifier.mockResolvedValue({ success: true, models: ["gpt-4o"] });

    const res = await POST(req({ provider: "openai", key: "sk-live" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true, models: ["gpt-4o"] });
    expect(mockVerifier).toHaveBeenCalledWith("sk-live");
  });

  it("reports a connection failure as unreachable, not a bad key", async () => {
    mockVerifier.mockRejectedValue(new Error("fetch failed"));

    const res = await POST(req({ provider: "openai", key: "sk-live" }));
    const data = await res.json();

    expect(data.success).toBe(false);
    expect(data.reason).toBe("unreachable");
    expect(data.error).toContain("Could not reach openai");
    expect(data.error).toContain("not checked");
  });

  it.each(["ENOTFOUND openrouter.ai", "EAI_AGAIN", "connect ECONNREFUSED"])(
    "treats %s as unreachable",
    async (message) => {
      mockVerifier.mockRejectedValue(new Error(message));

      const res = await POST(req({ provider: "openai", key: "sk-live" }));

      expect((await res.json()).reason).toBe("unreachable");
    },
  );

  it("treats a verifier timeout as unreachable", async () => {
    const timeout = new Error("The operation was aborted due to timeout");
    timeout.name = "TimeoutError";
    mockVerifier.mockRejectedValue(timeout);

    const res = await POST(req({ provider: "openai", key: "sk-live" }));
    const data = await res.json();

    expect(data.success).toBe(false);
    expect(data.reason).toBe("unreachable");
  });

  it("passes through other verifier error messages", async () => {
    mockVerifier.mockRejectedValue(new Error("Invalid API key"));

    const res = await POST(req({ provider: "openai", key: "sk-bad" }));
    const data = await res.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe("Invalid API key");
    expect(data.reason).toBeUndefined();
  });
});
