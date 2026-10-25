import { describe, expect, it } from "vitest";

import { supportsTemperature, withModelTemperature } from "@/lib/ai/model-params";

describe("supportsTemperature", () => {
  it("accepts temperature for classic GPT models", () => {
    expect(supportsTemperature("gpt-4o")).toBe(true);
    expect(supportsTemperature("gpt-4.1-mini")).toBe(true);
  });

  it("rejects temperature for the reasoning model families (#145)", () => {
    expect(supportsTemperature("gpt-6-sol")).toBe(false);
    expect(supportsTemperature("gpt-6.1-sol")).toBe(false);
    expect(supportsTemperature("gpt-5-mini")).toBe(false);
    expect(supportsTemperature("o3-mini")).toBe(false);
    expect(supportsTemperature("o4-mini-high")).toBe(false);
  });

  it("does not misfire on models that merely start with o or gpt", () => {
    // The registry's /models filter is `startsWith("gpt-") || startsWith("o")`,
    // so names like these flow through it too.
    expect(supportsTemperature("ollama-not-a-model")).toBe(true);
    expect(supportsTemperature("gpt-4-turbo")).toBe(true);
  });
});

describe("withModelTemperature", () => {
  it("strips temperature for reasoning models", () => {
    const params = withModelTemperature("gpt-6.1-sol", {
      temperature: 0.3,
      prompt: "hi",
    });
    expect(params).not.toHaveProperty("temperature");
    expect(params).toHaveProperty("prompt", "hi");
  });

  it("keeps temperature for models that accept it", () => {
    const params = withModelTemperature("gpt-4o", { temperature: 0.3 });
    expect(params).toEqual({ temperature: 0.3 });
  });
});
