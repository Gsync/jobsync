import { GET } from "@/app/api/ai/openai-compatible/models/route";

const { auth, resolveApiKey } = vi.hoisted(() => ({ auth: vi.fn(), resolveApiKey: vi.fn() }));
vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/api-key-resolver", () => ({ resolveApiKey }));

const fetchMock = vi.fn();
beforeEach(() => {
  auth.mockResolvedValue({ user: { id: "u" } });
  resolveApiKey.mockResolvedValue("http://h:1234/");
  vi.stubEnv("OPENAI_COMPATIBLE_BASE_URL", "http://h:1234");
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("rejects anonymous requests before looking up credentials", async () => {
  auth.mockResolvedValue(null);
  expect((await GET()).status).toBe(401);
  expect(resolveApiKey).not.toHaveBeenCalled();
});

it("explains where to set a missing URL", async () => {
  resolveApiKey.mockResolvedValue(undefined);
  const response = await GET();
  expect(resolveApiKey).toHaveBeenCalledWith("u", "openai-compatible");
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "No base URL is set for OpenAI-compatible. Add one under Settings → API Keys." });
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each([undefined, "k"])("passes through the models response with optional authentication", async key => {
  vi.stubEnv("OPENAI_COMPATIBLE_API_KEY", key);
  const models = { data: [{ id: "m" }, { id: "embedding" }] };
  fetchMock.mockResolvedValue(Response.json(models));
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(models);
  const [url, request] = fetchMock.mock.calls[0];
  expect(url).toBe("http://h:1234/v1/models");
  expect(request.signal).toBeInstanceOf(AbortSignal);
  expect(new Headers(request.headers).get("Authorization")).toBe(key ? "Bearer k" : null);
});

it("preserves an upstream failure status", async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
  const response = await GET();
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: "Failed to fetch OpenAI-compatible models" });
});

it("reports an unavailable server", async () => {
  fetchMock.mockRejectedValue(new Error("fetch failed"));
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "Cannot connect to the OpenAI-compatible server" });
});
