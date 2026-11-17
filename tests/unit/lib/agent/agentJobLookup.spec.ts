import { resolveJobForAgent } from "@/lib/agent/jobLookup";
import prisma from "@/lib/db";

vi.mock("@/lib/db", () => ({
  default: { job: { findFirst: vi.fn() } },
}));

const db = prisma as unknown as {
  job: { findFirst: ReturnType<typeof vi.fn> };
};

const job = {
  id: "job-1",
  description: "<p>Build things</p>",
  resumeId: "r9",
  workplaceType: "remote",
  JobTitle: { label: "Senior Backend Engineer" },
  Company: { label: "Northwind Cloud" },
  Location: { label: "Toronto" },
};

describe("resolveJobForAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.job.findFirst.mockResolvedValue(job);
  });

  it("returns no_job when there is no page job id", async () => {
    const result = await resolveJobForAgent("user-1", undefined);
    expect(result).toEqual({ status: "no_job" });
    expect(db.job.findFirst).not.toHaveBeenCalled();
  });

  // pageContext is client-supplied, so the userId in the where clause is the
  // only thing standing between the caller and someone else's job.
  it("scopes the lookup to the caller", async () => {
    await resolveJobForAgent("user-1", "job-1");
    expect(db.job.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "job-1", userId: "user-1" } }),
    );
  });

  it("includes the relations convertJobToText reads", async () => {
    await resolveJobForAgent("user-1", "job-1");
    const args = db.job.findFirst.mock.calls[0][0];
    expect(args.include).toEqual({
      JobTitle: true,
      Company: true,
      Location: true,
    });
  });

  it("returns the job when it belongs to the caller", async () => {
    const result = await resolveJobForAgent("user-1", "job-1");
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.job.id).toBe("job-1");
  });

  it("returns no_job when the id belongs to someone else", async () => {
    db.job.findFirst.mockResolvedValue(null);
    const result = await resolveJobForAgent("user-1", "someone-elses-job");
    expect(result).toEqual({ status: "no_job" });
  });
});
