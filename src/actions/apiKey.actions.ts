"use server";

import db from "@/lib/db";
import { getCurrentUser } from "@/utils/user.utils";
import { handleError } from "@/lib/utils";
import { encrypt, getLast4 } from "@/lib/encryption";
import { apiKeySaveSchema } from "@/models/apiKey.schema";
import type { ApiKeyClientResponse, ApiKeyProvider } from "@/models/apiKey.model";

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
        label: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    return {
      success: true,
      data: keys.map((k) => ({
        ...k,
        provider: k.provider as ApiKeyProvider,
      })),
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
}): Promise<{
  success: boolean;
  data?: ApiKeyClientResponse;
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Not authenticated" };

    const parsed = apiKeySaveSchema.parse(input);
    const { encrypted, iv } = encrypt(parsed.key);
    const last4 = getLast4(parsed.key);

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
        encryptedKey: encrypted,
        iv,
        last4,
        label: parsed.label,
      },
      update: {
        encryptedKey: encrypted,
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

    return {
      success: true,
      data: { ...apiKey, provider: apiKey.provider as ApiKeyProvider },
    };
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
        const { decrypt } = await import("@/lib/encryption");
        return decrypt(apiKey.encryptedKey, apiKey.iv);
      }
    }
  } catch {
    // Fall through to defaults
  }
  return process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
}
