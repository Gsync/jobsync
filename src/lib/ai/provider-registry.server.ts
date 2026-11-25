import "server-only";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { extractReasoningMiddleware, wrapLanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createOllama } from "ollama-ai-provider-v2";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { APP_CONSTANTS } from "@/lib/constants";

export function openaiCompatibleV1Url(baseUrl: string): string {
  const url = baseUrl.replace(/\/+$/, "");
  return url.endsWith("/v1") ? url : url + "/v1";
}

function openaiCompatibleApiKey(v1: string): string | undefined {
  const configured = process.env.OPENAI_COMPATIBLE_BASE_URL;
  if (configured && openaiCompatibleV1Url(configured) === v1) {
    return process.env.OPENAI_COMPATIBLE_API_KEY;
  }
}

export function fetchOpenaiCompatibleModels(baseUrl: string) {
  const v1 = openaiCompatibleV1Url(baseUrl);
  const apiKey = openaiCompatibleApiKey(v1);
  return fetch(v1 + "/models", {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    signal: AbortSignal.timeout(APP_CONSTANTS.AI_OLLAMA_LIST_TIMEOUT_MS),
  });
}

export const PROVIDER_FACTORIES: Record<
  string,
  (credential: string, modelName: string) => any
> = {
  "openai-compatible": (url, model) => {
    const baseURL = openaiCompatibleV1Url(url);
    const provider = createOpenAICompatible({
      name: "openai-compatible", baseURL, apiKey: openaiCompatibleApiKey(baseURL),
      includeUsage: true, supportsStructuredOutputs: true,
    });
    return wrapLanguageModel({
      model: provider.chatModel(model),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    });
  },
  openai: (apiKey, model) => createOpenAI({ apiKey })(model),
  openrouter: (apiKey, model) =>
    createOpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1" }).chat(model),
  deepseek: (apiKey, model) => createDeepSeek({ apiKey })(model),
  ollama: (baseURL, model) =>
    createOllama({ baseURL: baseURL + "/api" })(model),
  gemini: (apiKey, model) => createGoogleGenerativeAI({ apiKey })(model),
};

export const PROVIDER_VERIFIERS: Record<
  string,
  (key: string) => Promise<{ success: boolean; error?: string; reason?: "unreachable" }>
> = {
  openai: async (key) => {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(APP_CONSTANTS.AI_VERIFY_TIMEOUT_MS),
    });
    if (!res.ok)
      return {
        success: false,
        error:
          res.status === 401
            ? "Invalid API key"
            : `OpenAI returned ${res.status}`,
      };
    return { success: true };
  },

  // /api/v1/key is the authenticated endpoint. /models is public and answers
  // 200 to any key, so verifying against it passes anything pasted in.
  openrouter: async (key) => {
    const res = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(APP_CONSTANTS.AI_VERIFY_TIMEOUT_MS),
    });
    if (!res.ok)
      return {
        success: false,
        error:
          res.status === 401
            ? "Invalid API key"
            : `OpenRouter returned ${res.status}`,
      };
    return { success: true };
  },

  deepseek: async (key) => {
    const res = await fetch("https://api.deepseek.com/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(APP_CONSTANTS.AI_VERIFY_TIMEOUT_MS),
    });
    if (!res.ok)
      return {
        success: false,
        error:
          res.status === 401
            ? "Invalid API key"
            : `DeepSeek returned ${res.status}`,
      };
    return { success: true };
  },

  ollama: async (key) => {
    const baseUrl = key.replace(/\/+$/, "");
    try {
      const res = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(APP_CONSTANTS.AI_OLLAMA_LIST_TIMEOUT_MS),
      });
      if (!res.ok)
        return {
          success: false,
          error: `Cannot connect to Ollama at ${baseUrl}`,
        };
      return { success: true };
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        return {
          success: false,
          error: `Ollama at ${baseUrl} did not respond in time. Please make sure Ollama is running.`,
        };
      }
      if (
        error instanceof TypeError &&
        /failed to parse url/i.test(error.message)
      ) {
        return {
          success: false,
          error: `Invalid Ollama URL: ${baseUrl}`,
        };
      }
      return {
        success: false,
        error: `Cannot connect to Ollama at ${baseUrl}. Please make sure Ollama is running.`,
      };
    }
  },

  "openai-compatible": async (url) => {
    const v1 = openaiCompatibleV1Url(url);
    try {
      const response = await fetchOpenaiCompatibleModels(url);
      if (response.ok) return { success: true };
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: `OpenAI-compatible at ${v1} rejected the request (${response.status}). Its API key comes from OPENAI_COMPATIBLE_API_KEY on the JobSync server and is sent only when this URL matches OPENAI_COMPATIBLE_BASE_URL.`,
        };
      }
      return { success: false, error: `OpenAI-compatible at ${v1} returned ${response.status}.` };
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        return { success: false, reason: "unreachable", error: `OpenAI-compatible at ${v1} did not respond in time.` };
      }
      if (error instanceof TypeError && /failed to parse url/i.test(error.message)) {
        return { success: false, error: `Invalid OpenAI-compatible URL: ${v1}` };
      }
      return {
        success: false,
        reason: "unreachable",
        error: `Cannot connect to OpenAI-compatible at ${v1}. From Docker use http://host.docker.internal:<port>, and make the server listen on the network (LM Studio: Serve on Local Network).`,
      };
    }
  },

  gemini: async (key) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { signal: AbortSignal.timeout(APP_CONSTANTS.AI_VERIFY_TIMEOUT_MS) },
    );
    if (!res.ok)
      return {
        success: false,
        error:
          res.status === 400 || res.status === 403
            ? "Invalid API key"
            : `Gemini returned ${res.status}`,
      };
    return { success: true };
  },
};
