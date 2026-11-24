import { APP_CONSTANTS } from "@/lib/constants";
import { getAutomationMatchLimit } from "@/lib/scraper/automation-run/aiSettings";

it("serializes local matches and allows cloud matches in parallel", () => {
  expect(getAutomationMatchLimit("openai-compatible").concurrency).toBe(1);
  expect(getAutomationMatchLimit("ollama").concurrency).toBe(1);
  expect(getAutomationMatchLimit("openai").concurrency).toBe(APP_CONSTANTS.AUTOMATION_MATCH_CONCURRENCY);
});
