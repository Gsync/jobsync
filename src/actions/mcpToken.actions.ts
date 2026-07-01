"use server";

import prisma from "@/lib/db";
import { getCurrentUser } from "@/utils/user.utils";
import { handleError } from "@/lib/utils";
import { generateToken } from "@/lib/mcp/tokens";
import { APP_CONSTANTS } from "@/lib/constants";

export interface PublicTokenMeta {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt: Date;
  lastUsedAt: Date | null;
  createdAt: Date;
}

export async function createMcpToken(input: {
  name: string;
  expiryDays: 30 | 90 | 365;
}): Promise<
  | { success: true; token: string; record: PublicTokenMeta }
  | { success: false; message: string }
> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const count = await prisma.mcpAccessToken.count({ where: { userId: user.id } });
    if (count >= APP_CONSTANTS.MCP_TOKEN_MAX_PER_USER) {
      return {
        success: false,
        message: `You can have at most ${APP_CONSTANTS.MCP_TOKEN_MAX_PER_USER} MCP tokens. Revoke one before creating another.`,
      };
    }

    const { plaintext, hash, prefix } = generateToken();
    const expiresAt = new Date(Date.now() + input.expiryDays * 24 * 60 * 60 * 1000);

    const record = await prisma.mcpAccessToken.create({
      data: {
        userId: user.id,
        name: input.name.trim(),
        tokenHash: hash,
        tokenPrefix: prefix,
        scopes: JSON.stringify(["jobs:write", "questions:write"]),
        expiresAt,
      },
    });

    return {
      success: true,
      token: plaintext,
      record: toPublicMeta(record),
    };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { success: false, message: `A token named "${input.name}" already exists. Choose a different name.` };
    }
    const result = handleError(error, "Failed to create MCP token.");
    return { success: false, message: result?.message ?? "Failed to create MCP token." };
  }
}

export async function listMcpTokens(): Promise<PublicTokenMeta[]> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const records = await prisma.mcpAccessToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return records.map(toPublicMeta);
  } catch {
    return [];
  }
}

export async function revokeMcpToken(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    await prisma.mcpAccessToken.delete({ where: { id, userId: user.id } });
    return { success: true };
  } catch (error) {
    const result = handleError(error, "Failed to revoke MCP token.");
    return { success: false, message: result?.message ?? "Failed to revoke MCP token." };
  }
}

function toPublicMeta(record: {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string;
  expiresAt: Date;
  lastUsedAt: Date | null;
  createdAt: Date;
}): PublicTokenMeta {
  return {
    id: record.id,
    name: record.name,
    tokenPrefix: record.tokenPrefix,
    scopes: JSON.parse(record.scopes) as string[],
    expiresAt: record.expiresAt,
    lastUsedAt: record.lastUsedAt,
    createdAt: record.createdAt,
  };
}
