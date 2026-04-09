import {
  getAllJobLocations,
  getJobLocationsList,
  deleteJobLocationById,
} from "@/actions/jobLocation.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    location: {
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    workExperience: {
      count: vi.fn(),
    },
    education: {
      count: vi.fn(),
    },
    job: {
      count: vi.fn(),
    },
  };
  return { PrismaClient: vi.fn(function() { return mPrismaClient; }) };
});

vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Job Location Actions", () => {
  const mockUser = { id: "user-id" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllJobLocations", () => {
    it("should return job locations for authenticated user", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const mockLocations = [
        { id: "loc-1", label: "New York", value: "new york" },
        { id: "loc-2", label: "Remote", value: "remote" },
      ];
      (prisma.location.findMany as any).mockResolvedValue(mockLocations);

      const result = await getAllJobLocations();

      expect(result).toEqual(mockLocations);
      expect(prisma.location.findMany).toHaveBeenCalledWith({
        where: { createdBy: mockUser.id },
      });
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await getAllJobLocations();

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.location.findMany).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.location.findMany as any).mockRejectedValue(
        new Error("Database error")
      );

      const result = await getAllJobLocations();

      expect(result).toEqual({ success: false, message: "Database error" });
    });
  });

  describe("getJobLocationsList", () => {
    it("should return paginated location list", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const mockData = [
        { id: "loc-1", label: "New York", value: "new york" },
      ];
      const mockTotal = 1;

      (prisma.location.findMany as any).mockResolvedValue(mockData);
      (prisma.location.count as any).mockResolvedValue(mockTotal);

      const result = await getJobLocationsList(1, 10);

      expect(result).toEqual({ data: mockData, total: mockTotal });
      expect(prisma.location.findMany).toHaveBeenCalledWith({
        where: { createdBy: mockUser.id },
        skip: 0,
        take: 10,
        orderBy: { jobsApplied: { _count: "desc" } },
      });
      expect(prisma.location.count).toHaveBeenCalledWith({
        where: { createdBy: mockUser.id },
      });
    });

    it("should filter by countBy when provided", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const mockData = [
        { id: "loc-1", label: "New York", value: "new york" },
      ];
      (prisma.location.findMany as any).mockResolvedValue(mockData);
      (prisma.location.count as any).mockResolvedValue(1);

      const result = await getJobLocationsList(1, 10, "applied");

      expect(result).toEqual({ data: mockData, total: 1 });
      expect(prisma.location.findMany).toHaveBeenCalledWith({
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
        orderBy: { jobsApplied: { _count: "desc" } },
      });
    });

    it("should calculate skip correctly for page 3", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.location.findMany as any).mockResolvedValue([]);
      (prisma.location.count as any).mockResolvedValue(0);

      await getJobLocationsList(3, 5);

      expect(prisma.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 })
      );
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await getJobLocationsList(1, 10);

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.location.findMany).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      (getCurrentUser as any).mockRejectedValue(
        new Error("Database error")
      );

      const result = await getJobLocationsList(1, 10);

      expect(result).toEqual({ success: false, message: "Database error" });
    });
  });

  describe("deleteJobLocationById", () => {
    it("should delete a location successfully", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.workExperience.count as any).mockResolvedValue(0);
      (prisma.education.count as any).mockResolvedValue(0);
      (prisma.job.count as any).mockResolvedValue(0);
      const mockDeleted = { id: "loc-1", label: "New York" };
      (prisma.location.delete as any).mockResolvedValue(mockDeleted);

      const result = await deleteJobLocationById("loc-1");

      expect(result).toEqual({ res: mockDeleted, success: true });
      expect(prisma.location.delete).toHaveBeenCalledWith({
        where: { id: "loc-1", createdBy: mockUser.id },
      });
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await deleteJobLocationById("loc-1");

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.location.delete).not.toHaveBeenCalled();
    });

    it("should prevent deletion when work experiences exist", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.workExperience.count as any).mockResolvedValue(1);

      const result = await deleteJobLocationById("loc-1");

      expect(result).toEqual({
        success: false,
        message:
          "Job location cannot be deleted due to its use in experience section of one of the resume! ",
      });
      expect(prisma.education.count).not.toHaveBeenCalled();
      expect(prisma.location.delete).not.toHaveBeenCalled();
    });

    it("should prevent deletion when education records exist", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.workExperience.count as any).mockResolvedValue(0);
      (prisma.education.count as any).mockResolvedValue(2);

      const result = await deleteJobLocationById("loc-1");

      expect(result).toEqual({
        success: false,
        message:
          "Job location cannot be deleted due to its use in education section of one of the resume! ",
      });
      expect(prisma.job.count).not.toHaveBeenCalled();
      expect(prisma.location.delete).not.toHaveBeenCalled();
    });

    it("should prevent deletion when associated jobs exist", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.workExperience.count as any).mockResolvedValue(0);
      (prisma.education.count as any).mockResolvedValue(0);
      (prisma.job.count as any).mockResolvedValue(5);

      const result = await deleteJobLocationById("loc-1");

      expect(result).toEqual({
        success: false,
        message:
          "Location cannot be deleted due to 5 number of associated jobs! ",
      });
      expect(prisma.location.delete).not.toHaveBeenCalled();
    });

    it("should handle unexpected errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.workExperience.count as any).mockResolvedValue(0);
      (prisma.education.count as any).mockResolvedValue(0);
      (prisma.job.count as any).mockResolvedValue(0);
      (prisma.location.delete as any).mockRejectedValue(
        new Error("Delete failed")
      );

      const result = await deleteJobLocationById("loc-1");

      expect(result).toEqual({ success: false, message: "Delete failed" });
    });
  });
});
