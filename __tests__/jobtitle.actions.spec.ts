import {
  getAllJobTitles,
  getJobTitleList,
  createJobTitle,
  deleteJobTitleById,
} from "@/actions/jobtitle.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    jobTitle: {
      findMany: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    workExperience: {
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

describe("Job Title Actions", () => {
  const mockUser = { id: "user-id" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllJobTitles", () => {
    it("should return all job titles for authenticated user", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const mockTitles = [
        { id: "title-1", label: "Developer", value: "developer" },
        { id: "title-2", label: "Designer", value: "designer" },
      ];
      (prisma.jobTitle.findMany as any).mockResolvedValue(mockTitles);

      const result = await getAllJobTitles();

      expect(result).toEqual(mockTitles);
      expect(prisma.jobTitle.findMany).toHaveBeenCalledWith({
        where: { createdBy: mockUser.id },
      });
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await getAllJobTitles();

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.jobTitle.findMany).not.toHaveBeenCalled();
    });

    it("should handle unexpected errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.jobTitle.findMany as any).mockRejectedValue(
        new Error("Database error")
      );

      const result = await getAllJobTitles();

      expect(result).toEqual({ success: false, message: "Database error" });
    });
  });

  describe("getJobTitleList", () => {
    it("should return paginated job title list", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const mockData = [
        { id: "title-1", label: "Developer", value: "developer" },
      ];
      const mockTotal = 1;

      (prisma.jobTitle.findMany as any).mockResolvedValue(mockData);
      (prisma.jobTitle.count as any).mockResolvedValue(mockTotal);

      const result = await getJobTitleList(1, 10);

      expect(result).toEqual({ data: mockData, total: mockTotal });
      expect(prisma.jobTitle.findMany).toHaveBeenCalledWith({
        where: { createdBy: mockUser.id },
        skip: 0,
        take: 10,
        orderBy: { jobs: { _count: "desc" } },
      });
      expect(prisma.jobTitle.count).toHaveBeenCalledWith({
        where: { createdBy: mockUser.id },
      });
    });

    it("should filter by countBy when provided", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const mockData = [
        { id: "title-1", label: "Developer", value: "developer" },
      ];
      (prisma.jobTitle.findMany as any).mockResolvedValue(mockData);
      (prisma.jobTitle.count as any).mockResolvedValue(1);

      const result = await getJobTitleList(1, 10, "applied");

      expect(result).toEqual({ data: mockData, total: 1 });
      expect(prisma.jobTitle.findMany).toHaveBeenCalledWith({
        where: { createdBy: mockUser.id },
        skip: 0,
        take: 10,
        select: {
          id: true,
          label: true,
          value: true,
          _count: {
            select: {
              jobs: {
                where: { applied: true },
              },
            },
          },
        },
        orderBy: { jobs: { _count: "desc" } },
      });
    });

    it("should calculate skip correctly for page 2", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.jobTitle.findMany as any).mockResolvedValue([]);
      (prisma.jobTitle.count as any).mockResolvedValue(0);

      await getJobTitleList(2, 10);

      expect(prisma.jobTitle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await getJobTitleList(1, 10);

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.jobTitle.findMany).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      (getCurrentUser as any).mockRejectedValue(
        new Error("Database error")
      );

      const result = await getJobTitleList(1, 10);

      expect(result).toEqual({ success: false, message: "Database error" });
    });
  });

  describe("createJobTitle", () => {
    it("should upsert a job title successfully", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const mockTitle = {
        id: "title-1",
        label: "Senior Developer",
        value: "senior developer",
        createdBy: mockUser.id,
      };
      (prisma.jobTitle.upsert as any).mockResolvedValue(mockTitle);

      const result = await createJobTitle("Senior Developer");

      expect(result).toEqual(mockTitle);
      expect(prisma.jobTitle.upsert).toHaveBeenCalledWith({
        where: { value_createdBy: { value: "senior developer", createdBy: mockUser.id } },
        update: { label: "Senior Developer" },
        create: {
          label: "Senior Developer",
          value: "senior developer",
          createdBy: mockUser.id,
        },
      });
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await createJobTitle("Developer");

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.jobTitle.upsert).not.toHaveBeenCalled();
    });

    it("should handle unexpected errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.jobTitle.upsert as any).mockRejectedValue(
        new Error("Upsert failed")
      );

      const result = await createJobTitle("Developer");

      expect(result).toEqual({ success: false, message: "Upsert failed" });
    });
  });

  describe("deleteJobTitleById", () => {
    it("should delete a job title successfully", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.workExperience.count as any).mockResolvedValue(0);
      (prisma.job.count as any).mockResolvedValue(0);
      const mockDeleted = { id: "title-1", label: "Developer" };
      (prisma.jobTitle.delete as any).mockResolvedValue(mockDeleted);

      const result = await deleteJobTitleById("title-1");

      expect(result).toEqual({ res: mockDeleted, success: true });
      expect(prisma.jobTitle.delete).toHaveBeenCalledWith({
        where: { id: "title-1", createdBy: mockUser.id },
      });
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await deleteJobTitleById("title-1");

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.jobTitle.delete).not.toHaveBeenCalled();
    });

    it("should prevent deletion when work experiences exist", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.workExperience.count as any).mockResolvedValue(2);

      const result = await deleteJobTitleById("title-1");

      expect(result).toEqual({
        success: false,
        message:
          "Job title cannot be deleted due to its use in experience section of one of the resume! ",
      });
      expect(prisma.job.count).not.toHaveBeenCalled();
      expect(prisma.jobTitle.delete).not.toHaveBeenCalled();
    });

    it("should prevent deletion when associated jobs exist", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.workExperience.count as any).mockResolvedValue(0);
      (prisma.job.count as any).mockResolvedValue(3);

      const result = await deleteJobTitleById("title-1");

      expect(result).toEqual({
        success: false,
        message:
          "Job title cannot be deleted due to 3 number of associated jobs! ",
      });
      expect(prisma.jobTitle.delete).not.toHaveBeenCalled();
    });

    it("should handle unexpected errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.workExperience.count as any).mockResolvedValue(0);
      (prisma.job.count as any).mockResolvedValue(0);
      (prisma.jobTitle.delete as any).mockRejectedValue(
        new Error("Delete failed")
      );

      const result = await deleteJobTitleById("title-1");

      expect(result).toEqual({ success: false, message: "Delete failed" });
    });
  });
});
