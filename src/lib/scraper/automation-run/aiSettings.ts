import pLimit from "p-limit";
import { APP_CONSTANTS } from "@/lib/constants";
import type { ProviderType } from "@/lib/ai/providers";
import { isLocalProvider } from "@/lib/ai/provider-registry";

export { getUserAiSettings } from "@/lib/ai/aiConfig";

// Local servers serialize on the GPU, so it must process matches one at a time;
// other providers can fan out concurrently.
export function getAutomationMatchLimit(provider: ProviderType) {
  const concurrency =
    isLocalProvider(provider)
      ? 1
      : APP_CONSTANTS.AUTOMATION_MATCH_CONCURRENCY;
  return pLimit(concurrency);
}
