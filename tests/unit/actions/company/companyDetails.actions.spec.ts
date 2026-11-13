import { getCompanyDetails } from "@/actions/company.actions";
import { getCurrentUser } from "@/utils/user.utils";
import prisma from "@/lib/db";

vi.mock("@/lib/db", () => ({
  default: {
    company: { findFirst: vi.fn() },
    job: { findMany: vi.fn(), count: vi.fn() },
    contact: { findMany: vi.fn() },
  },
}));

vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const db = prisma as any;
const user = { id: "user-1" };
const company = {
  id: "co1",
  label: "Stripe",
  value: "stripe",
  createdBy: user.id,
};

describe("getCompanyDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(user);
    db.company.findFirst.mockResolvedValue(company);
    db.job.findMany.mockResolvedValue([]);
    db.job.count.mockResolvedValue(0);
    db.contact.findMany.mockResolvedValue([]);
  });

  it("returns null for a company the user does not own, reading nothing else", async () => {
    db.company.findFirst.mockResolvedValue(null);

    await expect(getCompanyDetails("co-other")).resolves.toBeNull();
    expect(db.company.findFirst).toHaveBeenCalledWith({
      where: { id: "co-other", createdBy: user.id },
    });
    expect(db.job.findMany).not.toHaveBeenCalled();
    expect(db.contact.findMany).not.toHaveBeenCalled();
  });

  it("scopes every job and contact query to the session user", async () => {
    await getCompanyDetails("co1");

    expect(db.job.findMany.mock.calls[0][0].where).toMatchObject({
      companyId: "co1",
      userId: user.id,
    });
    expect(db.job.count.mock.calls[0][0].where).toMatchObject({
      companyId: "co1",
      userId: user.id,
    });
    expect(db.contact.findMany.mock.calls.map((c: any) => c[0].where)).toEqual([
      { companyId: "co1", createdBy: user.id },
      { workedAtCompanyId: "co1", createdBy: user.id },
    ]);
  });

  it("lists jobs newest first and leaves dismissed jobs out", async () => {
    await getCompanyDetails("co1");

    const args = db.job.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.where.OR).toEqual([
      { discoveryStatus: null },
      { discoveryStatus: { not: "dismissed" } },
    ]);
  });

  it("counts dismissed jobs separately so the delete check still sees them", async () => {
    db.job.count.mockResolvedValue(3);

    const result = await getCompanyDetails("co1");

    expect(db.job.count.mock.calls[0][0].where).toEqual({
      companyId: "co1",
      userId: user.id,
      discoveryStatus: "dismissed",
    });
    expect(result.dismissedJobsCount).toBe(3);
  });

  it("derives appliedCount from the applied flag", async () => {
    db.job.findMany.mockResolvedValue([
      { id: "j1", applied: true, matchScore: null, matchData: null },
      { id: "j2", applied: false, matchScore: null, matchData: null },
      { id: "j3", applied: true, matchScore: null, matchData: null },
    ]);

    const result = await getCompanyDetails("co1");

    expect(result.appliedCount).toBe(2);
    expect(result.jobs).toHaveLength(3);
  });

  it("hides the pre-rank score of an un-analyzed job and drops matchData", async () => {
    db.job.findMany.mockResolvedValue([
      {
        id: "j1",
        applied: false,
        matchScore: 29,
        matchData: JSON.stringify({ analyzed: false }),
      },
      {
        id: "j2",
        applied: false,
        matchScore: 71,
        matchData: JSON.stringify({ matchScore: 71 }),
      },
    ]);

    const result = await getCompanyDetails("co1");

    expect(result.jobs).toEqual([
      { id: "j1", applied: false, matchScore: null },
      { id: "j2", applied: false, matchScore: 71 },
    ]);
  });

  it("returns the company with its two contact groups", async () => {
    const dave = { id: "c1", name: "Dave" };
    const priya = { id: "c2", name: "Priya" };
    db.contact.findMany
      .mockResolvedValueOnce([dave])
      .mockResolvedValueOnce([priya]);

    const result = await getCompanyDetails("co1");

    expect(result).toMatchObject({
      id: "co1",
      label: "Stripe",
      currentContacts: [dave],
      formerContacts: [priya],
    });
  });

  it("fails cleanly when not authenticated", async () => {
    (getCurrentUser as any).mockResolvedValue(null);

    await expect(getCompanyDetails("co1")).resolves.toEqual({
      success: false,
      message: "Not authenticated",
    });
    expect(db.company.findFirst).not.toHaveBeenCalled();
  });
});
