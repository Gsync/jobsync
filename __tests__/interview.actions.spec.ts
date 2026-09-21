import {
  getInterviewList,
  getInterviewFilterOptions,
} from "@/actions/interview.actions";
import { getCurrentUser } from "@/utils/user.utils";
import prisma from "@/lib/db";

vi.mock("@/lib/db", () => {
  const jobStage = {
    findMany: vi.fn(),
    count: vi.fn(),
  };
  return { default: { jobStage } };
});

vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));

const db = prisma as any;
const user = { id: "user-1" };

beforeEach(() => {
  vi.clearAllMocks();
  (getCurrentUser as any).mockResolvedValue(user);
  db.jobStage.findMany.mockResolvedValue([]);
  db.jobStage.count.mockResolvedValue(0);
});

describe("getInterviewList", () => {
  it("reads only interview-status stages owned through the job", async () => {
    await getInterviewList("all");

    const where = db.jobStage.findMany.mock.calls[0][0].where;
    expect(where.Job).toEqual({ userId: user.id });
    expect(where.StageType).toEqual({ Status: { value: "interview" } });
  });

  it("treats undated rounds as upcoming and orders them first", async () => {
    await getInterviewList("upcoming");

    const args = db.jobStage.findMany.mock.calls[0][0];
    expect(args.where.OR).toEqual([
      { occurredAt: { gte: expect.any(Date) } },
      { occurredAt: null },
    ]);
    // SQLite sorts NULL first on ASC, which is what puts undated rounds on top
    expect(args.orderBy[0]).toEqual({ occurredAt: "asc" });
  });

  it("orders past rounds newest first over a set with no undated rows", async () => {
    await getInterviewList("past");

    const args = db.jobStage.findMany.mock.calls[0][0];
    expect(args.where.occurredAt).toEqual({ lt: expect.any(Date) });
    expect(args.where.OR).toBeUndefined();
    expect(args.orderBy[0]).toEqual({ occurredAt: "desc" });
  });

  it("pins undated rounds to page 1 of the All view", async () => {
    db.jobStage.findMany
      .mockResolvedValueOnce([{ id: "dated" }])
      .mockResolvedValueOnce([{ id: "undated" }]);
    db.jobStage.count.mockResolvedValue(2);

    const res = await getInterviewList("all", 1);

    // The paged query excludes NULLs; SQLite sorts them last on DESC, which
    // would otherwise strand them on the final page.
    expect(db.jobStage.findMany.mock.calls[0][0].where.occurredAt).toEqual({
      not: null,
    });
    expect(db.jobStage.findMany.mock.calls[1][0].where.occurredAt).toBeNull();
    expect(res.data.map((r: any) => r.id)).toEqual(["undated", "dated"]);
    expect(res.total).toBe(2);
  });

  it("does not re-fetch the pinned rows on later pages", async () => {
    await getInterviewList("all", 2);

    expect(db.jobStage.findMany).toHaveBeenCalledTimes(1);
  });

  it("filters by round, company and search together", async () => {
    await getInterviewList("all", 1, 25, "acme", "type-1", "co-1");

    const where = db.jobStage.findMany.mock.calls[0][0].where;
    expect(where.AND).toEqual([
      { stageTypeId: "type-1" },
      { Job: { companyId: "co-1" } },
      {
        OR: [
          { Job: { JobTitle: { label: { contains: "acme" } } } },
          { Job: { Company: { label: { contains: "acme" } } } },
          { StageType: { label: { contains: "acme" } } },
          { interviewers: { some: { Contact: { name: { contains: "acme" } } } } },
        ],
      },
    ]);
  });

  it("returns the error envelope when there is no session", async () => {
    (getCurrentUser as any).mockResolvedValue(null);

    const res = await getInterviewList("all");

    expect(res).toEqual({ success: false, message: "Not authenticated" });
  });
});

describe("getInterviewFilterOptions", () => {
  it("offers only rounds and companies that actually have interviews", async () => {
    db.jobStage.findMany.mockResolvedValue([
      {
        stageTypeId: "t-final",
        StageType: { label: "Final / Onsite Interview", sortOrder: 6 },
        Job: { companyId: "c-north", Company: { label: "Northwind Labs" } },
      },
      {
        stageTypeId: "t-screen",
        StageType: { label: "1st Screening Interview", sortOrder: 4 },
        Job: { companyId: "c-acme", Company: { label: "Acme Health" } },
      },
      {
        stageTypeId: "t-screen",
        StageType: { label: "1st Screening Interview", sortOrder: 4 },
        Job: { companyId: "c-north", Company: { label: "Northwind Labs" } },
      },
    ]);

    const res = await getInterviewFilterOptions();

    expect(db.jobStage.findMany.mock.calls[0][0].where).toEqual({
      Job: { userId: user.id },
      StageType: { Status: { value: "interview" } },
    });
    // De-duplicated; rounds in Library order, companies alphabetically
    expect(res.rounds).toEqual([
      { id: "t-screen", label: "1st Screening Interview" },
      { id: "t-final", label: "Final / Onsite Interview" },
    ]);
    expect(res.companies).toEqual([
      { id: "c-acme", label: "Acme Health" },
      { id: "c-north", label: "Northwind Labs" },
    ]);
  });
});
