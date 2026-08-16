import { createMcpToken } from "@/actions/mcpToken.actions";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/utils/user.utils";
import { generateToken } from "@/lib/mcp/tokens";

vi.mock("@/lib/db", () => ({
  default: {
    mcpAccessToken: {
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/mcp/tokens", () => ({
  generateToken: vi.fn(),
}));

describe("createMcpToken", () => {
  it("grants new tokens explicit read access while retaining write scopes", async () => {
    (getCurrentUser as any).mockResolvedValue({ id: "user-1" });
    (prisma.mcpAccessToken.count as any).mockResolvedValue(0);
    (generateToken as any).mockReturnValue({
      plaintext: "jsync_plaintext",
      hash: "token-hash",
      prefix: "jsync_plain",
    });
    (prisma.mcpAccessToken.create as any).mockImplementation(({ data }: any) => ({
      id: "token-1",
      ...data,
      lastUsedAt: null,
      createdAt: new Date("2026-08-16T00:00:00Z"),
    }));

    const result = await createMcpToken({ name: "Windmill", expiryDays: 90 });

    expect(result.success).toBe(true);
    expect(prisma.mcpAccessToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        scopes: JSON.stringify([
          "jobs:read",
          "jobs:write",
          "questions:write",
          "resume:write",
        ]),
      }),
    });
  });
});
