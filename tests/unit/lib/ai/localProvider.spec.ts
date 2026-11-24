import { verifyLocalProvider } from "@/lib/ai/localProvider.server";
import { resolveApiKey } from "@/lib/api-key-resolver";
import { PROVIDER_VERIFIERS } from "@/lib/ai/provider-registry.server";

vi.mock("@/lib/api-key-resolver", () => ({ resolveApiKey: vi.fn() }));
vi.mock("@/lib/ai/provider-registry.server", () => ({
  PROVIDER_VERIFIERS: { ollama: vi.fn(), "openai-compatible": vi.fn() },
}));

it("skips credential resolution for cloud providers", async () => {
  expect(await verifyLocalProvider("u", "openai")).toEqual({ success: true });
  expect(resolveApiKey).not.toHaveBeenCalled();
});

it.each(["ollama", "openai-compatible"])("checks the resolved URL for %s", async (provider) => {
  vi.mocked(resolveApiKey).mockResolvedValue("http://local");
  const result = { success: false, error: "Server unavailable" };
  vi.mocked(PROVIDER_VERIFIERS[provider]).mockResolvedValue(result);
  expect(await verifyLocalProvider("u", provider)).toEqual(result);
  expect(resolveApiKey).toHaveBeenCalledWith("u", provider);
  expect(PROVIDER_VERIFIERS[provider]).toHaveBeenCalledWith("http://local");
});

it("reports a missing URL before calling the verifier", async () => {
  vi.mocked(resolveApiKey).mockResolvedValue(undefined);
  expect(await verifyLocalProvider("u", "openai-compatible")).toEqual({
    success: false,
    error: "No base URL is set for OpenAI-compatible. Add one under Settings → API Keys.",
  });
  expect(PROVIDER_VERIFIERS["openai-compatible"]).not.toHaveBeenCalled();
});
