import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

// Records the first request body, then fails so no response has to be faked
async function captureRequestBody(id: string) {
  let body: Record<string, unknown> = {};
  const fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    body = JSON.parse(String(init?.body));
    throw new Error("captured");
  };
  const openai = createOpenAI({ apiKey: "test", fetch });
  await expect(
    generateText({
      model: openai(id),
      prompt: "hi",
      temperature: 0.3,
      maxRetries: 0,
    }),
  ).rejects.toThrow();
  return body;
}

describe("@ai-sdk/openai reasoning-model params", () => {
  it.each(["gpt-6-sol", "gpt-6.1-sol", "o3-mini", "gpt-5-mini"])(
    "omits temperature for reasoning model %s",
    async (id) => {
      const body = await captureRequestBody(id);
      expect(body).not.toHaveProperty("temperature");
    },
  );

  it.each(["gpt-4o", "gpt-5-chat-latest"])(
    "keeps temperature for non-reasoning model %s",
    async (id) => {
      const body = await captureRequestBody(id);
      expect(body.temperature).toBe(0.3);
    },
  );
});
