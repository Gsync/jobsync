import { handleListJobs } from "@/lib/mcp/tools/listJobs";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { PrismaClient } from "@/generated/prisma/client";

const prisma = new PrismaClient({} as never);

vi.mock("@/generated/prisma/client", () => {
  const mPrismaClient = { job: { findMany: vi.fn() } };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});

vi.mock("@/lib/mcp/rate-limit", () => ({
  checkMcpRateLimit: vi.fn(() => ({ allowed: true, resetIn: 0 })),
}));

function row(id: string) {
  return {
    id,
    jobUrl: null,
    createdAt: new Date("2026-09-18T10:00:00Z"),
    Status: { value: "applied" },
    JobTitle: { label: "Senior UI Engineer" },
    Company: { label: "Atolio" },
    Location: null,
  };
}

const args = () => (prisma.job.findMany as any).mock.calls[0][0];

describe("handleListJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkMcpRateLimit as any).mockReturnValue({ allowed: true, resetIn: 0 });
    (prisma.job.findMany as any).mockResolvedValue([]);
  });

  it("scopes to the user and applies every filter by canonical value", async () => {
    await handleListJobs(
      {
        company: "Atolio Inc.",
        status: "applied",
        source: "Indeed",
        createdAfter: "2026-09-01T00:00:00Z",
      },
      "user-1",
    );

    expect(args().where).toEqual({
      userId: "user-1",
      Company: { value: "atolio" },
      Status: { value: "applied" },
      JobSource: { value: "indeed" },
      createdAt: { gte: new Date("2026-09-01T00:00:00Z") },
    });
  });

  it("returns compact rows and the next offset when more remain", async () => {
    (prisma.job.findMany as any).mockResolvedValue([row("a"), row("b"), row("c")]);

    const result = await handleListJobs({ limit: 2, offset: 4 }, "user-1");

    expect(args()).toMatchObject({ skip: 4, take: 3 });
    expect(result.structuredContent).toEqual({
      jobs: [
        {
          id: "a",
          company: "Atolio",
          title: "Senior UI Engineer",
          location: null,
          status: "applied",
          createdAt: "2026-09-18T10:00:00.000Z",
          jobUrl: null,
        },
        expect.objectContaining({ id: "b" }),
      ],
      nextOffset: 6,
    });
    expect(result.content[0].text).toContain("offset 6");
  });

  it("returns a null next offset on the last page", async () => {
    (prisma.job.findMany as any).mockResolvedValue([row("a")]);

    const result = await handleListJobs({}, "user-1");

    expect(result.structuredContent?.nextOffset).toBeNull();
  });

  it("short-circuits when rate limited", async () => {
    (checkMcpRateLimit as any).mockReturnValue({ allowed: false, resetIn: 3000 });

    const result = await handleListJobs({}, "user-1");

    expect(result.content[0].text).toContain("Rate limit exceeded");
    expect(prisma.job.findMany).not.toHaveBeenCalled();
  });
});
