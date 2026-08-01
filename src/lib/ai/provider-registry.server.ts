import "server-only";

import { createOpenAI } from "@ai-sdk/openai";
import { createOllama } from "ollama-ai-provider-v2";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { APP_CONSTANTS } from "@/lib/constants";

export const PROVIDER_FACTORIES: Record<
  string,
  (credential: string, modelName: string) => any
> = {
  openai: (apiKey, model) => createOpenAI({ apiKey })(model),
  "openai-compatible": () => {
    throw new Error("openai-compatible is handled specially in getModel()");
  },
  openrouter: (apiKey, model) =>
    createOpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1" })(model),
  deepseek: (apiKey, model) => createDeepSeek({ apiKey })(model),
  ollama: (baseURL, model) =>
    createOllama({ baseURL: baseURL + "/api" })(model),
  gemini: (apiKey, model) => createGoogleGenerativeAI({ apiKey })(model),
};

export const PROVIDER_VERIFIERS: Record<
  string,
  (key: any) => Promise<{ success: boolean; error?: string }>
> = {
  openai: async (key) => {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
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

  "openai-compatible": async (key) => {
    const params = typeof key === "object" ? key : { baseURL: key, apiKey: undefined };
    const headers: Record<string, string> = {};
    if (params.apiKey) {
      headers["Authorization"] = `Bearer ${params.apiKey}`;
    }
    const baseUrl = params.baseURL.replace(/\/+$/, "");
    const res = await fetch(`${baseUrl}/v1/models`, { headers });
    if (!res.ok)
      return {
        success: false,
        error:
          res.status === 401
            ? "Invalid API key"
            : `OpenAI-compatible endpoint returned ${res.status}`,
      };
    return { success: true };
  },

  openrouter: async (key) => {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
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

  gemini: async (key) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
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

  rapidapi: async (key) => {
    const res = await fetch(
      "https://jsearch.p.rapidapi.com/search?query=test&num_pages=1",
      {
        headers: {
          "X-RapidAPI-Key": key,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      },
    );
    if (!res.ok)
      return {
        success: false,
        error:
          res.status === 403
            ? "Invalid API key"
            : `RapidAPI returned ${res.status}`,
      };
    return { success: true };
  },
};
