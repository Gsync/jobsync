export type CredentialType = "api-key" | "base-url";
export type ProviderCategory = "cloud" | "local";

export interface ProviderRegistryEntry {
  id: string;
  displayName: string;
  credentialType: CredentialType;
  category: ProviderCategory;
  envVar?: string;
  defaultCredential?: string;
  modelsEndpoint?: string;
  parseModelsResponse?: (data: any) => string[];
  requiresRunningCheck: boolean;
  supportsKeepAlive: boolean;
  keyConfig: {
    placeholder: string;
    inputType: "password" | "text";
    description: string;
    sensitive: boolean;
  };
}

export const PROVIDER_REGISTRY: Record<string, ProviderRegistryEntry> = {
  ollama: {
    id: "ollama",
    displayName: "Ollama",
    credentialType: "base-url",
    category: "local",
    envVar: "OLLAMA_BASE_URL",
    defaultCredential: "http://127.0.0.1:11434",
    modelsEndpoint: "ollama/tags",
    parseModelsResponse: (data) => data.models?.map((m: any) => m.name) ?? [],
    requiresRunningCheck: true,
    supportsKeepAlive: true,
    keyConfig: {
      placeholder: "http://127.0.0.1:11434",
      inputType: "text",
      description: "Base URL for your Ollama instance",
      sensitive: false,
    },
  },

  openai: {
    id: "openai",
    displayName: "OpenAI",
    credentialType: "api-key",
    category: "cloud",
    envVar: "OPENAI_API_KEY",
    modelsEndpoint: "openai/models",
    parseModelsResponse: (data) =>
      (data.data?.map((m: any) => m.id) ?? [])
        .filter((id: string) => id.startsWith("gpt-") || id.startsWith("o"))
        .sort(),
    requiresRunningCheck: false,
    supportsKeepAlive: false,
    keyConfig: {
      placeholder: "sk-...",
      inputType: "password",
      description: "Used for GPT models in resume review and job matching",
      sensitive: true,
    },
  },

  deepseek: {
    id: "deepseek",
    displayName: "DeepSeek",
    credentialType: "api-key",
    category: "cloud",
    envVar: "DEEPSEEK_API_KEY",
    modelsEndpoint: "deepseek/models",
    parseModelsResponse: (data) => data.data?.map((m: any) => m.id) ?? [],
    requiresRunningCheck: false,
    supportsKeepAlive: false,
    keyConfig: {
      placeholder: "sk-...",
      inputType: "password",
      description: "Used for DeepSeek models in resume review and job matching",
      sensitive: true,
    },
  },
  gemini: {
    id: "gemini",
    displayName: "Google Gemini",
    credentialType: "api-key",
    category: "cloud",
    envVar: "GEMINI_API_KEY",
    modelsEndpoint: "gemini/models",
    parseModelsResponse: (data) =>
      data.models?.map((m: any) => m.name?.replace("models/", "")) ?? [],
    requiresRunningCheck: false,
    supportsKeepAlive: false,
    keyConfig: {
      placeholder: "AIza...",
      inputType: "password",
      description: "Used for Gemini models in resume review and job matching",
      sensitive: true,
    },
  },
};

export const AI_PROVIDERS = ["ollama", "openai", "deepseek", "gemini"] as const;
export type AiProviderId = (typeof AI_PROVIDERS)[number];

export function getAiProviders(): ProviderRegistryEntry[] {
  return AI_PROVIDERS.map((id) => PROVIDER_REGISTRY[id]);
}
