/**
 * Per-model request-parameter gating (#145).
 *
 * OpenAI's reasoning models — the gpt-5/6+ families and the o-series — run on
 * the Responses API and reject `temperature` outright (HTTP 400, "Unsupported
 * parameter: 'temperature' is not supported with this model"), while older
 * GPT models accept it. The provider registry lists models dynamically from
 * /v1/models, so unsupported families are recognized by name here instead of
 * maintained as an allowlist.
 */

const TEMPERATURE_UNSUPPORTED = /^(o\d|gpt-[5-9])/i;

/** Whether this model accepts a `temperature` request parameter. Unknown model names (undefined/empty) keep the legacy behavior. */
export function supportsTemperature(modelName: string | undefined): boolean {
  if (!modelName) return true;
  return !TEMPERATURE_UNSUPPORTED.test(modelName.trim());
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
