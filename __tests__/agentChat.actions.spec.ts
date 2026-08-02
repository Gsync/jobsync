import {
  getChatConversation,
  saveChatConversation,
  clearChatConversation,
} from "@/actions/agentChat.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";
import { APP_CONSTANTS } from "@/lib/constants";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    chatConversation: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(function () {
      return mPrismaClient;
    }),
  };
});

vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));

const mockUser = { id: "user-1" };
const msg = (id: string) => ({
  id,
  role: "user",
  parts: [{ type: "text", text: id }],
});

describe("agentChat actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockUser);
  });

  it("getChatConversation scopes the read by userId", async () => {
    (prisma.chatConversation.findUnique as any).mockResolvedValue({
      messages: JSON.stringify([msg("a")]),
    });
    const result = await getChatConversation();
    expect(prisma.chatConversation.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(result.data).toEqual([msg("a")]);
  });

  it("getChatConversation returns an empty transcript when there is no row", async () => {
    (prisma.chatConversation.findUnique as any).mockResolvedValue(null);
    const result = await getChatConversation();
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it("getChatConversation returns an empty transcript when the JSON is corrupt", async () => {
    (prisma.chatConversation.findUnique as any).mockResolvedValue({
      messages: "{ not json",
    });
    const result = await getChatConversation();
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it("saveChatConversation upserts on userId and never accepts one as an argument", async () => {
    await saveChatConversation([msg("a")] as any);
    const call = (prisma.chatConversation.upsert as any).mock.calls[0][0];
    expect(call.where).toEqual({ userId: "user-1" });
    expect(call.create.userId).toBe("user-1");
    expect(saveChatConversation.length).toBe(1);
  });

  it("saveChatConversation trims to the newest AGENT_CHAT_MAX_STORED_MESSAGES", async () => {
    const many = Array.from(
      { length: APP_CONSTANTS.AGENT_CHAT_MAX_STORED_MESSAGES + 5 },
      (_, i) => msg(`m${i}`),
    );
    await saveChatConversation(many as any);
    const call = (prisma.chatConversation.upsert as any).mock.calls[0][0];
    const stored = JSON.parse(call.update.messages);
    expect(stored).toHaveLength(APP_CONSTANTS.AGENT_CHAT_MAX_STORED_MESSAGES);
    expect(stored[stored.length - 1].id).toBe(`m${many.length - 1}`);
  });

  it("clearChatConversation deletes only the caller's row", async () => {
    await clearChatConversation();
    expect(prisma.chatConversation.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });

  it("every action fails closed without a session", async () => {
    (getCurrentUser as any).mockResolvedValue(null);
    expect((await getChatConversation()).success).toBe(false);
    expect((await saveChatConversation([])).success).toBe(false);
    expect((await clearChatConversation()).success).toBe(false);
    expect(prisma.chatConversation.upsert).not.toHaveBeenCalled();
    expect(prisma.chatConversation.deleteMany).not.toHaveBeenCalled();
  });
});
