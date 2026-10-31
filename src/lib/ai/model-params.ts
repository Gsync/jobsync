/**
 * Per-model request-parameter gating (#145).
 *
 * OpenAI's reasoning models — the gpt-5/6+ families and the o-series — run on
 * the Responses API and reject `temperature` outright (HTTP 400, "Unsupported
 * parameter: 'temperature' is not supported with this model"), while older
 * GPT models accept it. The provider registry lists models dynamically from
 * /v1/models, so unsupported families are recognized by name here instead of
 * maintained as an allowlist.
 *
 * Matches a model name that the API rejects `temperature` for. Two families,
 * and each needs its own carve-out:
 *
 * - `gpt-5`/`6`/`7`… accept it, except the `-chat` variants, which are the
 *   non-reasoning members of the family (`gpt-5-chat-latest`, `gpt-6-chat`)
 *   and do take a temperature. Matching `gpt-6` alone would send a
 *   temperature-less request for them where the API is happy to take one.
 * - The o-series only in its numbered form (`o1`, `o3-mini`, `o4-mini-high`).
 *   A bare `o` prefix would also match unrelated models, and the registry's
 *   /models filter is `startsWith("gpt-") || startsWith("o")`, so those names
 *   really do reach here.
 *
 * This is a fallback, not the only defence: `@ai-sdk/openai` strips
 * `temperature` for the reasoning models it knows. It just does not know
 * these families, and its `forceReasoning` flag would also flip
 * `systemMessageMode` to "developer", so the parameter is withheld here.
 */
const TEMPERATURE_UNSUPPORTED = /^(?:o[1-9]\d*(?:-|$)|(?:gpt|chatgpt)-[5-9]\d*(?!-chat))/i;

/** Whether this model accepts a `temperature` request parameter. Unknown model names (undefined/empty) keep the legacy behavior. */
export function supportsTemperature(modelName: string | undefined): boolean {
  if (!modelName) return true;
  const name = modelName.trim();
  // `openai/gpt-6.1` from an aggregator: judge the model, not the vendor.
  const bare = name.includes("/") ? name.slice(name.lastIndexOf("/") + 1) : name;
  return !TEMPERATURE_UNSUPPORTED.test(bare);
}

/**
 * Returns the request params with `temperature` removed for models that
 * reject it; otherwise returns the params untouched. Callers spread the
 * result into their `streamText` / `generateText` options.
 */
export function withModelTemperature<T extends { temperature?: number }>(
  modelName: string | undefined,
  params: T,
): T {
  if (supportsTemperature(modelName)) return params;
  const { temperature: _omitted, ...rest } = params;
  return rest as T;
}
