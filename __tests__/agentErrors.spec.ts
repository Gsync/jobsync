import { mapAgentError } from "@/lib/agent/errors";
import {
  NoSuchToolError,
  InvalidToolInputError,
  APICallError,
  RetryError,
} from "ai";

const apiCallError = (statusCode: number, message = "Provider returned error") =>
  new APICallError({
    message,
    url: "https://openrouter.ai/api/v1/responses",
    requestBodyValues: {},
    statusCode,
  });

describe("mapAgentError", () => {
  it("never echoes an unmapped error's message", () => {
    const marker = "SENSITIVE-REQUEST-CONTEXT-9f3a";
    const mapped = mapAgentError(new Error(`Request failed: ${marker}`));
    expect(mapped).not.toContain(marker);
    expect(mapped.length).toBeGreaterThan(0);
  });

  it("names the provider when the service is unreachable", () => {
    const mapped = mapAgentError(new Error("fetch failed"), {
      provider: "ollama",
    });
    expect(mapped).toMatch(/ollama/i);
    expect(mapped).toMatch(/settings/i);
    expect(
      mapAgentError(new Error("connect ECONNREFUSED 127.0.0.1:11434"), {
        provider: "ollama",
      }),
    ).toMatch(/ollama/i);
  });

  it("names the provider and model when the model cannot tool-call", () => {
    const mapped = mapAgentError(new Error("model does not support tools"), {
      provider: "ollama",
      model: "llama3.1",
    });
    expect(mapped).toMatch(/llama3\.1/);
    expect(mapped).toMatch(/tool/i);
    expect(mapped).toMatch(/settings/i);
  });

  it("names the rate limit and the model on a 429", () => {
    const mapped = mapAgentError(apiCallError(429), {
      provider: "openrouter",
      model: "qwen/qwen3.8-27b:free",
    });
    expect(mapped).toMatch(/rate-limited/i);
    expect(mapped).toMatch(/qwen\/qwen3\.8-27b:free/);
  });

  it("sees the status through the RetryError the SDK throws after retries", () => {
    const wrapped = new RetryError({
      message: "Failed after 3 attempts. Last error: Provider returned error",
      reason: "maxRetriesExceeded",
      errors: [apiCallError(429)],
    });
    expect(mapAgentError(wrapped, { provider: "openrouter" })).toMatch(
      /rate-limited/i,
    );
  });

  it("points a rejected key at Settings on a 401", () => {
    const mapped = mapAgentError(apiCallError(401, "User not found."), {
      provider: "openrouter",
    });
    expect(mapped).toMatch(/rejected the API key/i);
    expect(mapped).toMatch(/settings/i);
  });

  it("does not echo the provider's body on a mapped status", () => {
    const marker = "user_39CAXN1SLbb8LlFuJ4uyCKjcXWB";
    const mapped = mapAgentError(apiCallError(429, `limit hit ${marker}`), {
      provider: "openrouter",
    });
    expect(mapped).not.toContain(marker);
  });

  it("maps OpenRouter's tool-routing 404 to the tool-support message", () => {
    const mapped = mapAgentError(
      apiCallError(
        404,
        'No endpoints found that support tool use. Try disabling "add_job".',
      ),
      { provider: "openrouter", model: "nvidia/nemotron-3.5-content-safety" },
    );
    expect(mapped).toMatch(/cannot use tools/i);
    expect(mapped).toMatch(/nemotron/);
    expect(mapped).toMatch(/settings/i);
  });

  it("maps a stale approval to a message naming Clear as the remedy", () => {
    const stale = Object.assign(new Error("no tool call found"), {
      name: "AI_ToolCallNotFoundForApprovalError",
    });
    expect(mapAgentError(stale)).toMatch(/clear/i);
  });

  it("maps abort and timeout distinctly from a connection failure", () => {
    const aborted = Object.assign(new Error("The operation was aborted."), {
      name: "AbortError",
    });
    const mapped = mapAgentError(aborted);
    expect(mapped).toMatch(/(stopped|took too long|timed out)/i);
    expect(mapped).not.toMatch(/ECONNREFUSED/);
  });

  it("maps NoSuchToolError and InvalidToolInputError to distinct messages", () => {
    const noSuch = mapAgentError(
      new NoSuchToolError({ toolName: "delete_everything" }),
    );
    const badInput = mapAgentError(
      new InvalidToolInputError({
        toolName: "add_job",
        toolInput: "{}",
        cause: new Error("bad"),
      }),
    );
    expect(noSuch).not.toBe(badInput);
    expect(noSuch).toMatch(/tool/i);
    expect(badInput).toMatch(/(argument|input)/i);
  });

  it("produces four distinct messages for the four headline failures", () => {
    const messages = new Set([
      mapAgentError(new Error("fetch failed"), { provider: "ollama" }),
      mapAgentError(new Error("does not support tools"), {
        provider: "ollama",
        model: "m",
      }),
      mapAgentError(new NoSuchToolError({ toolName: "x" })),
      mapAgentError(Object.assign(new Error("aborted"), { name: "AbortError" })),
    ]);
    expect(messages.size).toBe(4);
  });
});
