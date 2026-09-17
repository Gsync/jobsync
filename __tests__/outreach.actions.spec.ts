import { logOutreach, getFollowUpsDue, markOutreachReplied } from "@/actions/outreach/outreach.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    job: { count: vi.fn() },
    outreach: { create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});
vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));

const prisma = new PrismaClient() as unknown as {
  job: { count: ReturnType<typeof vi.fn> };
  outreach: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};
const mockUser = vi.mocked(getCurrentUser);

describe("outreach actions", () => {
  beforeEach(() => mockUser.mockResolvedValue({ id: "u1" } as never));

  it("auto-sets followUpDue ~12 days after sentAt", async () => {
    prisma.job.count.mockResolvedValue(1);
    prisma.outreach.create.mockImplementation(async (args: any) => ({ id: "o1", ...args.data }));
    const sentAt = new Date("2026-09-17T00:00:00Z");
    const res = (await logOutreach({ jobId: "j1", sentAt })) as {
      success: boolean;
      data: { followUpDue: Date };
    };
    expect(res.success).toBe(true);
    expect(res.data.followUpDue.toISOString()).toBe("2026-09-29T00:00:00.000Z");
  });

  it("requires a link and ownership", async () => {
    expect((await logOutreach({})).success).not.toBe(true);
    prisma.job.count.mockResolvedValue(0);
    expect((await logOutreach({ jobId: "nope" })).success).not.toBe(true);
  });

  it("getFollowUpsDue only returns unreplied, due items for the user", async () => {
    prisma.outreach.findMany.mockResolvedValue([]);
    await getFollowUpsDue(new Date("2026-09-30"));
    expect(prisma.outreach.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ repliedAt: null, job: { userId: "u1" } }),
      })
    );
  });

  it("markOutreachReplied stamps repliedAt + outcome", async () => {
    prisma.outreach.update.mockResolvedValue({ id: "o1" });
    const res = await markOutreachReplied("o1", "meeting");
    expect(res.success).toBe(true);
    expect(prisma.outreach.update.mock.calls[0][0].data).toMatchObject({ outcome: "meeting" });
    expect(prisma.outreach.update.mock.calls[0][0].data.repliedAt).toBeInstanceOf(Date);
  });
});
