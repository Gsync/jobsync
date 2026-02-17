import {
  getAllJobLocations,
  getJobLocationsList,
  deleteJobLocationById,
} from "@/actions/jobLocation.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

jest.mock("@prisma/client", () => {
  const mPrismaClient = {
    location: {
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    workExperience: {
      count: jest.fn(),
    },
    education: {
      count: jest.fn(),
    },
    job: {
      count: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

jest.mock("@/utils/user.utils", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("Job Location Actions", () => {
  const mockUser = { id: "user-id" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllJobLocations", () => {
    it("should return job locations for authenticated user", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      const mockLocations = [
        { id: "loc-1", label: "New York", value: "new york" },
        { id: "loc-2", label: "Remote", value: "remote" },
      ];
      (prisma.location.findMany as jest.Mock).mockResolvedValue(mockLocations);

      const result = await getAllJobLocations();

      expect(result).toEqual(mockLocations);
      expect(prisma.location.findMany).toHaveBeenCalledWith({
        where: { createdBy: mockUser.id },
      });
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await getAllJobLocations();

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.location.findMany).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.location.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const result = await getAllJobLocations();

      expect(result).toEqual({ success: false, message: "Database error" });
    });
  });

  describe("getJobLocationsList", () => {
    it("should return paginated location list", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      const mockData = [
        { id: "loc-1", label: "New York", value: "new york" },
      ];
      const mockTotal = 1;

      (prisma.location.findMany as jest.Mock).mockResolvedValue(mockData);
      (prisma.location.count as jest.Mock).mockResolvedValue(mockTotal);

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
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      const mockData = [
        { id: "loc-1", label: "New York", value: "new york" },
      ];
      (prisma.location.findMany as jest.Mock).mockResolvedValue(mockData);
      (prisma.location.count as jest.Mock).mockResolvedValue(1);

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
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.location.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.location.count as jest.Mock).mockResolvedValue(0);

      await getJobLocationsList(3, 5);

      expect(prisma.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 })
      );
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await getJobLocationsList(1, 10);

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.location.findMany).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      (getCurrentUser as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const result = await getJobLocationsList(1, 10);

      expect(result).toEqual({ success: false, message: "Database error" });
    });
  });

  describe("deleteJobLocationById", () => {
    it("should delete a location successfully", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.workExperience.count as jest.Mock).mockResolvedValue(0);
      (prisma.education.count as jest.Mock).mockResolvedValue(0);
      (prisma.job.count as jest.Mock).mockResolvedValue(0);
      const mockDeleted = { id: "loc-1", label: "New York" };
      (prisma.location.delete as jest.Mock).mockResolvedValue(mockDeleted);

      const result = await deleteJobLocationById("loc-1");

      expect(result).toEqual({ res: mockDeleted, success: true });
      expect(prisma.location.delete).toHaveBeenCalledWith({
        where: { id: "loc-1", createdBy: mockUser.id },
      });
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await deleteJobLocationById("loc-1");

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.location.delete).not.toHaveBeenCalled();
    });

    it("should prevent deletion when work experiences exist", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.workExperience.count as jest.Mock).mockResolvedValue(1);

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
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.workExperience.count as jest.Mock).mockResolvedValue(0);
      (prisma.education.count as jest.Mock).mockResolvedValue(2);

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
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.workExperience.count as jest.Mock).mockResolvedValue(0);
      (prisma.education.count as jest.Mock).mockResolvedValue(0);
      (prisma.job.count as jest.Mock).mockResolvedValue(5);

      const result = await deleteJobLocationById("loc-1");

      expect(result).toEqual({
        success: false,
        message:
          "Location cannot be deleted due to 5 number of associated jobs! ",
      });
      expect(prisma.location.delete).not.toHaveBeenCalled();
    });

    it("should handle unexpected errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.workExperience.count as jest.Mock).mockResolvedValue(0);
      (prisma.education.count as jest.Mock).mockResolvedValue(0);
      (prisma.job.count as jest.Mock).mockResolvedValue(0);
      (prisma.location.delete as jest.Mock).mockRejectedValue(
        new Error("Delete failed")
      );

      const result = await deleteJobLocationById("loc-1");

      expect(result).toEqual({ success: false, message: "Delete failed" });
    });
  });
});
