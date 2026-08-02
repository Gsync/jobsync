"use server";

import type { UIMessage } from "ai";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { getCurrentUser } from "@/utils/user.utils";
import { APP_CONSTANTS } from "@/lib/constants";

export const getChatConversation = async (): Promise<{
  success: boolean;
  data?: UIMessage[];
  message?: string;
}> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const row = await prisma.chatConversation.findUnique({
      where: { userId: user.id },
    });
    if (!row) return { success: true, data: [] };

    // A corrupt row must not break the whole dashboard layout, which awaits
    // this on every render — an empty transcript is the safe answer.
    try {
      return { success: true, data: JSON.parse(row.messages) as UIMessage[] };
    } catch {
      console.error("Chat conversation JSON was unreadable; returning empty.");
      return { success: true, data: [] };
    }
  } catch (error) {
    return handleError(error, "Failed to load the conversation.");
  }
};

export const saveChatConversation = async (
  messages: UIMessage[],
): Promise<{ success: boolean; message?: string }> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const trimmed = messages.slice(
      -APP_CONSTANTS.AGENT_CHAT_MAX_STORED_MESSAGES,
    );
    const serialized = JSON.stringify(trimmed);

    await prisma.chatConversation.upsert({
      where: { userId: user.id },
      update: { messages: serialized },
      create: { userId: user.id, messages: serialized },
    });

    return { success: true };
  } catch (error) {
    return handleError(error, "Failed to save the conversation.");
  }
};

export const clearChatConversation = async (): Promise<{
  success: boolean;
  message?: string;
}> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    // deleteMany, not delete: deleting a row that does not exist must not
    // throw, since Clear is the hard reset and has to always work.
    await prisma.chatConversation.deleteMany({ where: { userId: user.id } });

    return { success: true };
  } catch (error) {
    return handleError(error, "Failed to clear the conversation.");
  }
};
