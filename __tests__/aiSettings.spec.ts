vi.mock("@/lib/db", () => ({ default: {} }));

import { AiProvider } from "@/models/ai.model";
import { getDefaultModelForProvider } from "@/lib/scraper/automation-run/aiSettings";

describe("getDefaultModelForProvider", () => {
  it("requires an explicit model for openai-compatible", () => {
    expect(() =>
      getDefaultModelForProvider(AiProvider.OPENAI_COMPATIBLE),
    ).toThrow("Select a model for the OpenAI-compatible provider");
  });
});
