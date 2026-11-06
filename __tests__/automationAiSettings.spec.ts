import {
  getAutomationMatchLimit,
  getDefaultModelForProvider,
} from "@/lib/scraper/automation-run/aiSettings";
import { AiProvider } from "@/models/ai.model";

async function maxConcurrency(provider: AiProvider, tasks: number) {
  const limit = getAutomationMatchLimit(provider);
  let active = 0;
  let peak = 0;
  await Promise.all(
    Array.from({ length: tasks }, () =>
      limit(async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
      }),
    ),
  );
  return peak;
}

describe("getAutomationMatchLimit", () => {
  it("serializes Ollama matches to one at a time", async () => {
    expect(await maxConcurrency(AiProvider.OLLAMA, 5)).toBe(1);
  });

  it("serializes Strata matches to one at a time", async () => {
    expect(await maxConcurrency(AiProvider.STRATA, 5)).toBe(1);
  });

  it("lets cloud providers fan out beyond one", async () => {
    expect(await maxConcurrency(AiProvider.OPENAI, 5)).toBeGreaterThan(1);
  });
});

describe("getDefaultModelForProvider", () => {
  it("returns an empty string for Strata (no fixed default model)", () => {
    expect(getDefaultModelForProvider(AiProvider.STRATA)).toBe("");
  });

  it("returns a fixed default for Ollama", () => {
    expect(getDefaultModelForProvider(AiProvider.OLLAMA)).toBeTruthy();
  });
});
