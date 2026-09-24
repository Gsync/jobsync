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
  // Non-zero, so the dated page is actually queried
  db.jobStage.count.mockResolvedValue(1);
});

describe("getInterviewList", () => {
  it("reads only interview-status stages owned through the job", async () => {
    await getInterviewList();

    const where = db.jobStage.findMany.mock.calls[0][0].where;
    expect(where.Job).toEqual({ userId: user.id });
    expect(where.StageType).toEqual({ Status: { value: "interview" } });
  });

  it("orders dated rounds newest first over a set with no undated rows", async () => {
    await getInterviewList();

    const args = db.jobStage.findMany.mock.calls[0][0];
    expect(args.where.AND).toContainEqual({ occurredAt: { not: null } });
    expect(args.orderBy[0]).toEqual({ occurredAt: "desc" });
    // total === datedTotal, so no second query for undated rows
    expect(db.jobStage.findMany).toHaveBeenCalledTimes(1);
  });

  it("appends undated rounds after the dated ones", async () => {
    db.jobStage.findMany
      .mockResolvedValueOnce([{ id: "dated" }])
      .mockResolvedValueOnce([{ id: "undated" }]);
    // total 2, dated 1
    db.jobStage.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    const res = await getInterviewList(1);

    expect(db.jobStage.findMany.mock.calls[0][0].where.AND).toContainEqual({
      occurredAt: { not: null },
    });
    expect(db.jobStage.findMany.mock.calls[1][0].where.AND).toContainEqual({
      occurredAt: null,
    });
    expect(res.data.map((r: any) => r.id)).toEqual(["dated", "undated"]);
    expect(res.total).toBe(2);
  });

  it("pages past the dated rows straight into the undated ones", async () => {
    // 30 dated rows, 5 undated; page 2 of 25 is the tail of both
    db.jobStage.count.mockResolvedValueOnce(35).mockResolvedValueOnce(30);
    db.jobStage.findMany.mockResolvedValue([]);

    await getInterviewList(2, 25);

    expect(db.jobStage.findMany.mock.calls[0][0]).toMatchObject({
      skip: 25,
      take: 5,
    });
    expect(db.jobStage.findMany.mock.calls[1][0]).toMatchObject({
      skip: 0,
      take: 25,
    });
  });

  it("filters by round, company and search together", async () => {
    await getInterviewList(1, 25, "acme", "type-1", "co-1");

    const where = db.jobStage.findMany.mock.calls[0][0].where;
    expect(where.AND.slice(0, 3)).toEqual([
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

    const res = await getInterviewList();

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
