// Covers the paginated list in jobSource.actions.ts — not the same-named
// bare-array getJobSourceList in job/references.ts (see job.actions.spec.ts).
import {
  getJobSourceList,
  deleteJobSourceById,
} from "@/actions/jobSource.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    jobSource: {
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    job: {
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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Job Source Actions", () => {
  const mockUser = { id: "user-id" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getJobSourceList", () => {
    it("should return paginated job source list", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const mockData = [{ id: "src-1", label: "LinkedIn", value: "linkedin" }];
      (prisma.jobSource.findMany as any).mockResolvedValue(mockData);
      (prisma.jobSource.count as any).mockResolvedValue(1);

      const result = await getJobSourceList(1, 10);

      expect(result).toEqual({ data: mockData, total: 1 });
      expect(prisma.jobSource.findMany).toHaveBeenCalledWith({
        where: { createdBy: mockUser.id },
        skip: 0,
        take: 10,
        orderBy: [{ jobsApplied: { _count: "desc" } }, { label: "asc" }],
      });
      expect(prisma.jobSource.count).toHaveBeenCalledWith({
        where: { createdBy: mockUser.id },
      });
    });

    it("should select applied counts and splice jobsTotal when countBy is provided", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const mockData = [{ id: "src-1", label: "LinkedIn", value: "linkedin" }];
      (prisma.jobSource.findMany as any).mockResolvedValue(mockData);
      (prisma.jobSource.count as any).mockResolvedValue(1);
      (prisma.job.groupBy as any).mockResolvedValue([
        { jobSourceId: "src-1", _count: { id: 4 } },
      ]);

      const result = await getJobSourceList(1, 10, "applied");

      expect(result).toEqual({
        data: [{ ...mockData[0], _count: { jobsTotal: 4 } }],
        total: 1,
      });
      expect(prisma.jobSource.findMany).toHaveBeenCalledWith({
        where: { createdBy: mockUser.id },
        skip: 0,
        take: 10,
        select: {
          id: true,
          label: true,
          value: true,
          _count: {
            select: {
              jobsApplied: {
                where: { applied: true },
              },
            },
          },
        },
        orderBy: [{ jobsApplied: { _count: "desc" } }, { label: "asc" }],
      });
      expect(prisma.job.groupBy).toHaveBeenCalledWith({
        by: ["jobSourceId"],
        where: { userId: mockUser.id },
        _count: { id: true },
      });
    });

    it("should calculate skip correctly for page 3", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.jobSource.findMany as any).mockResolvedValue([]);
      (prisma.jobSource.count as any).mockResolvedValue(0);

      await getJobSourceList(3, 5);

      expect(prisma.jobSource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 })
      );
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await getJobSourceList(1, 10);

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.jobSource.findMany).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      (getCurrentUser as any).mockRejectedValue(new Error("Database error"));

      const result = await getJobSourceList(1, 10);

      expect(result).toEqual({ success: false, message: "Database error" });
    });

    it("should filter job sources by label when search is provided", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const mockData = [{ id: "src-1", label: "LinkedIn", value: "linkedin" }];
      (prisma.jobSource.findMany as any).mockResolvedValue(mockData);
      (prisma.jobSource.count as any).mockResolvedValue(1);

      const result = await getJobSourceList(1, 10, undefined, "Link");

      expect(result).toEqual({ data: mockData, total: 1 });
      expect(prisma.jobSource.findMany).toHaveBeenCalledWith({
        where: { createdBy: mockUser.id, OR: [{ label: { contains: "Link" } }] },
        skip: 0,
        take: 10,
        orderBy: [{ jobsApplied: { _count: "desc" } }, { label: "asc" }],
      });
      expect(prisma.jobSource.count).toHaveBeenCalledWith({
        where: { createdBy: mockUser.id, OR: [{ label: { contains: "Link" } }] },
      });
    });

    it("should not apply a label filter when search is empty", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.jobSource.findMany as any).mockResolvedValue([]);
      (prisma.jobSource.count as any).mockResolvedValue(0);

      await getJobSourceList(1, 10, undefined, "");

      expect(prisma.jobSource.findMany).toHaveBeenCalledWith({
        where: { createdBy: mockUser.id },
        skip: 0,
        take: 10,
        orderBy: [{ jobsApplied: { _count: "desc" } }, { label: "asc" }],
      });
    });
  });

  describe("deleteJobSourceById", () => {
    it("should delete a job source with no linked jobs", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.job.count as any).mockResolvedValue(0);
      (prisma.jobSource.delete as any).mockResolvedValue({ id: "src-1" });

      const result = await deleteJobSourceById("src-1");

      expect(result).toEqual({ res: { id: "src-1" }, success: true });
      expect(prisma.jobSource.delete).toHaveBeenCalledWith({
        where: { id: "src-1", createdBy: mockUser.id },
      });
    });

    it("should refuse to delete a job source that has linked jobs", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.job.count as any).mockResolvedValue(2);

      const result = await deleteJobSourceById("src-1");

      expect(result).toEqual({
        success: false,
        message:
          "Job source cannot be deleted due to 2 number of associated jobs! ",
      });
      expect(prisma.jobSource.delete).not.toHaveBeenCalled();
    });
  });
});
