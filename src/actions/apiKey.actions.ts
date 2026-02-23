"use server";

import db from "@/lib/db";
import { getCurrentUser } from "@/utils/user.utils";
import { handleError } from "@/lib/utils";
import { encrypt, getLast4 } from "@/lib/encryption";
import { apiKeySaveSchema } from "@/models/apiKey.schema";
import type {
  ApiKeyClientResponse,
  ApiKeyProvider,
} from "@/models/apiKey.model";

export async function getUserApiKeys(): Promise<{
  success: boolean;
  data?: ApiKeyClientResponse[];
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Not authenticated" };

    const keys = await db.apiKey.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        provider: true,
        last4: true,
        iv: true,
        encryptedKey: true,
        label: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    return {
      success: true,
      data: keys.map((k) => {
        const isSensitive = k.iv !== "";
        return {
          id: k.id,
          provider: k.provider as ApiKeyProvider,
          last4: k.last4,
          ...(isSensitive ? {} : { displayValue: k.encryptedKey }),
          label: k.label,
          createdAt: k.createdAt,
          lastUsedAt: k.lastUsedAt,
        };
      }),
    };
  } catch (error) {
    return handleError(error, "Failed to fetch API keys") as {
      success: boolean;
      message: string;
    };
  }
}

export async function saveApiKey(input: {
  provider: string;
  key: string;
  label?: string;
  sensitive?: boolean;
}): Promise<{
  success: boolean;
  data?: ApiKeyClientResponse;
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Not authenticated" };

    const parsed = apiKeySaveSchema.parse(input);
    const isSensitive = parsed.sensitive;

    let encryptedKey: string;
    let iv: string;
    let last4: string;

    if (isSensitive) {
      const result = encrypt(parsed.key);
      encryptedKey = result.encrypted;
      iv = result.iv;
      last4 = getLast4(parsed.key);
    } else {
      // Non-sensitive values stored as plaintext
      encryptedKey = parsed.key;
      iv = "";
      last4 = parsed.key;
    }

    const apiKey = await db.apiKey.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: parsed.provider,
        },
      },
      create: {
        userId: user.id,
        provider: parsed.provider,
        encryptedKey,
        iv,
        last4,
        label: parsed.label,
      },
      update: {
        encryptedKey,
        iv,
        last4,
        label: parsed.label,
      },
      select: {
        id: true,
        provider: true,
        last4: true,
        label: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    const response: ApiKeyClientResponse = {
      ...apiKey,
      provider: apiKey.provider as ApiKeyProvider,
    };
    if (!isSensitive) {
      response.displayValue = parsed.key;
    }

    return { success: true, data: response };
  } catch (error) {
    return handleError(error, "Failed to save API key") as {
      success: boolean;
      message: string;
    };
  }
}

export async function deleteApiKey(provider: string): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Not authenticated" };

    await db.apiKey.deleteMany({
      where: { userId: user.id, provider },
    });

    return { success: true };
  } catch (error) {
    return handleError(error, "Failed to delete API key") as {
      success: boolean;
      message: string;
    };
  }
}

export async function getDefaultOllamaBaseUrl(): Promise<string> {
  return process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
}

export async function getOllamaBaseUrl(): Promise<string> {
  try {
    const user = await getCurrentUser();
    if (user) {
      const apiKey = await db.apiKey.findUnique({
        where: {
          userId_provider: { userId: user.id, provider: "ollama" },
        },
      });
      if (apiKey) {
        if (apiKey.iv === "") return apiKey.encryptedKey;
        const { decrypt } = await import("@/lib/encryption");
        return decrypt(apiKey.encryptedKey, apiKey.iv);
      }
    }
  } catch {
    // Fall through to defaults
  }
  return process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
}
