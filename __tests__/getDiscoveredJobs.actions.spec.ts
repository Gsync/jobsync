import { getDiscoveredJobs } from "@/actions/automation.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    job: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(function () {
      return mPrismaClient;
    }),
  };
});

vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: vi.fn(),
}));

describe("getDiscoveredJobs status filtering", () => {
  const mockUser = { id: "user-id" };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.job.findMany as any).mockResolvedValue([]);
    (prisma.job.count as any).mockResolvedValue(0);
    (prisma.job.groupBy as any).mockResolvedValue([]);
  });

  it("filters by a single discoveryStatus", async () => {
    await getDiscoveredJobs({ discoveryStatus: "new" });

    const where = (prisma.job.findMany as any).mock.calls[0][0].where;
    expect(where.discoveryStatus).toBe("new");
  });

  it("filters by multiple discoveryStatus values using an 'in' clause", async () => {
    await getDiscoveredJobs({ discoveryStatus: ["new", "accepted"] });

    const where = (prisma.job.findMany as any).mock.calls[0][0].where;
    expect(where.discoveryStatus).toEqual({ in: ["new", "accepted"] });
  });

  it("omits the discoveryStatus filter when none is given", async () => {
    await getDiscoveredJobs({});

    const where = (prisma.job.findMany as any).mock.calls[0][0].where;
    expect(where.discoveryStatus).toBeUndefined();
  });

  it("excludes discoveryStatus from the groupBy count so counts are unaffected by the filter", async () => {
    await getDiscoveredJobs({ discoveryStatus: ["new", "accepted"] });

    const countWhere = (prisma.job.groupBy as any).mock.calls[0][0].where;
    expect(countWhere.discoveryStatus).toBeUndefined();
  });
});
