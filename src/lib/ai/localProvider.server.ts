import "server-only";

import { resolveApiKey } from "@/lib/api-key-resolver";
import { isLocalProvider, PROVIDER_REGISTRY } from "./provider-registry";
import { PROVIDER_VERIFIERS } from "./provider-registry.server";

export async function verifyLocalProvider(userId: string, provider: string): Promise<
  { success: true } | { success: false; error: string }
> {
  if (!isLocalProvider(provider)) return { success: true };

  const name = PROVIDER_REGISTRY[provider].displayName;
  const url = await resolveApiKey(userId, provider);
  if (!url) {
    return {
      success: false,
      error: `No base URL is set for ${name}. Add one under Settings → API Keys.`,
    };
  }

  const result = await PROVIDER_VERIFIERS[provider](url);
  if (result.success) return { success: true };
  return { success: false, error: result.error || `${name} is not available.` };
}
