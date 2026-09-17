import { handleLogOutreach } from "@/lib/mcp/tools/logOutreach";
import { PrismaClient } from "@prisma/client";

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    job: { count: vi.fn() },
    contact: { findFirst: vi.fn(), create: vi.fn() },
    outreach: { create: vi.fn() },
  };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});
vi.mock("@/lib/mcp/rate-limit", () => ({
  checkMcpRateLimit: () => ({ allowed: true, resetIn: 0 }),
}));

const prisma = new PrismaClient() as unknown as {
  job: { count: ReturnType<typeof vi.fn> };
  contact: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  outreach: { create: ReturnType<typeof vi.fn> };
};

describe("mcp log_outreach", () => {
  it("logs with auto follow-up and reuses existing contacts", async () => {
    prisma.job.count.mockResolvedValue(1);
    prisma.contact.findFirst.mockResolvedValue({ id: "c1" });
    prisma.outreach.create.mockImplementation(async ({ data }: any) => ({
      id: "o1",
      followUpDue: data.followUpDue,
    }));
    const res = await handleLogOutreach(
      { jobId: "j1", contactName: "Prof. X", subject: "Hi", sentAt: "2026-09-17T00:00:00.000Z" },
      "u1"
    );
    expect(res.content[0].text).toMatch(/Outreach logged \(o1\)\. Follow-up due 2026-09-29/);
    expect(prisma.contact.create).not.toHaveBeenCalled();
  });

  it("creates missing contacts and rejects orphan outreach", async () => {
    prisma.job.count.mockResolvedValue(1);
    prisma.contact.findFirst.mockResolvedValue(null);
    prisma.contact.create.mockResolvedValue({ id: "c2" });
    prisma.outreach.create.mockResolvedValue({ id: "o2", followUpDue: new Date() });
    await handleLogOutreach({ contactName: "New Prof" }, "u1");
    expect(prisma.contact.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "New Prof" }) })
    );
    const res = await handleLogOutreach({}, "u1");
    expect(res.content[0].text).toMatch(/supply jobId or contactName/);
  });
});
