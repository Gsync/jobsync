import {
  addJob,
  createLocation,
  deleteJobById,
  getJobDetails,
  getJobsList,
  getJobSourceList,
  getStatusList,
  updateJob,
  updateJobStatus,
} from "@/actions/job.actions";
import { getMockJobDetails, getMockJobsList } from "@/lib/mock.utils";
import { JobResponse } from "@/models/job.model";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Mock the Prisma Client
jest.mock("@prisma/client", () => {
  const mPrismaClient = {
    jobStatus: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    jobSource: {
      findMany: jest.fn(),
    },
    job: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    location: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

jest.mock("@/utils/user.utils", () => ({
  getCurrentUser: jest.fn(),
}));

describe("jobActions", () => {
  const mockUser = { id: "user-id" };
  const jobData = {
    id: "job-id",
    title: "job-title-id",
    company: "company-id",
    location: "location-id",
    type: "FT",
    status: "status-id",
    source: "source-id",
    salaryRange: "$50,000 - $70,000",
    createdAt: expect.any(Date),
    dueDate: new Date("2023-01-01"),
    dateApplied: new Date("2022-12-31"),
    jobDescription: "Job description",
    jobUrl: "https://example.com/job",
    applied: true,
    userId: mockUser.id,
    resume: "",
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe("getStatusList", () => {
    it("should return status list on successful query", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const mockStatuses = [
        { id: "1", label: "Pending", value: "pending" },
        { id: "2", label: "Processing", value: "processing" },
      ];
      (prisma.jobStatus.findMany as jest.Mock).mockResolvedValue(mockStatuses);

      const result = await getStatusList();
      expect(result).toEqual(mockStatuses);
    });

    it("should throw error on failure", async () => {
      const mockErrorResponse = {
        success: false,
        message: "Failed to fetch status list.",
      };
      (prisma.jobStatus.findMany as jest.Mock).mockRejectedValue(
        new Error("Failed to fetch status list.")
      );

      await expect(getStatusList()).resolves.toStrictEqual(mockErrorResponse);
    });
  });
  describe("getJobSourceList", () => {
    it("should return job source list on successful query", async () => {
      const mockData = [
        { id: "1", label: "Source 1", value: "source1" },
        { id: "2", label: "Source 2", value: "source2" },
      ];
      (prisma.jobSource.findMany as jest.Mock).mockResolvedValue(mockData);

      const result = await getJobSourceList();

      expect(result).toEqual(mockData);
      expect(prisma.jobSource.findMany).toHaveBeenCalledTimes(1);
    });

    it("should returns failure response on error", async () => {
      (prisma.jobSource.findMany as jest.Mock).mockRejectedValue(
        new Error("Failed to fetch job source list.")
      );

      const result = await getJobSourceList();

      expect(result).toEqual({
        success: false,
        message: "Failed to fetch job source list.",
      });

      expect(prisma.jobSource.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("getJobsList", () => {
    it("should retrieve jobs with default parameters", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      const { data, total } = await getMockJobsList(1, 10);
      (prisma.job.findMany as jest.Mock).mockResolvedValue(data);
      (prisma.job.count as jest.Mock).mockResolvedValue(total);

      const result = await getJobsList();

      expect(result).toEqual({
        success: true,
        data,
        total,
      });
      expect(prisma.job.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.job.count).toHaveBeenCalledTimes(1);
    });
    it("should return error when fetching data fails", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      (prisma.job.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const result = await getJobsList();

      expect(result).toEqual({
        success: false,
        message: "Database error",
      });
    });
    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await getJobsList();

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });
  });
  describe("getJobDetails", () => {
    it("should throw error when jobId is not provided", async () => {
      await expect(getJobDetails("")).resolves.toStrictEqual({
        success: false,
        message: "Please provide job id",
      });
    });
    it("should throw error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(getJobDetails("job123")).resolves.toStrictEqual({
        success: false,
        message: "Not authenticated",
      });
    });
  });
  it("should return job details on successful query", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    const mockJob = await getMockJobDetails("2");
    (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);

    const result = await getJobDetails("2");

    expect(result).toStrictEqual({ job: mockJob, success: true });
    expect(prisma.job.findUnique).toHaveBeenCalledWith({
      where: {
        id: "2",
      },
      include: {
        JobSource: true,
        JobTitle: true,
        Company: true,
        Status: true,
        Location: true,
        Resume: {
          include: {
            File: true,
          },
        },
      },
    });
  });

  it("should handle unexpected errors", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: "user123" });

    (prisma.job.findUnique as jest.Mock).mockRejectedValue(
      new Error("Unexpected error")
    );

    await expect(getJobDetails("job123")).resolves.toStrictEqual({
      success: false,
      message: "Unexpected error",
    });
  });
  it("should throw error when user is not authenticated", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    await expect(getJobDetails("job123")).resolves.toStrictEqual({
      success: false,
      message: "Not authenticated",
    });
  });
  describe("createLocation", () => {
    it("should throw error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(createLocation("location-name")).resolves.toStrictEqual({
        success: false,
        message: "Not authenticated",
      });
    });
    it("should throw error when location name is not provided or empty", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      await expect(createLocation(" ")).resolves.toStrictEqual({
        success: false,
        message: "Please provide location name",
      });
    });
    it("should create with valid input", async () => {
      const label = "New Location";
      const mockLocation = {
        label: "New Location",
        value: "new location",
        createdBy: mockUser.id,
      };
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      (prisma.location.create as jest.Mock).mockResolvedValue(mockLocation);

      const result = await createLocation(label);

      expect(prisma.location.create).toHaveBeenCalledTimes(1);
      expect(prisma.location.create).toHaveBeenCalledWith({
        data: mockLocation,
      });
      expect(result).toStrictEqual({
        data: {
          ...mockLocation,
        },
        success: true,
      });
    });
    it("should handle unexpected errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      (prisma.location.create as jest.Mock).mockRejectedValue(
        new Error("Unexpected error")
      );

      await expect(createLocation("location-name")).resolves.toStrictEqual({
        success: false,
        message: "Unexpected error",
      });
    });
  });
  describe("addJob", () => {
    it("should create a new job successfully", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.job.create as jest.Mock).mockResolvedValue(jobData);

      const result = await addJob(jobData);

      expect(result).toStrictEqual({ job: jobData, success: true });
      expect(prisma.job.create).toHaveBeenCalledTimes(1);
      expect(prisma.job.create).toHaveBeenCalledWith({
        data: {
          jobTitleId: jobData.title,
          companyId: jobData.company,
          locationId: jobData.location,
          statusId: jobData.status,
          jobSourceId: jobData.source,
          salaryRange: jobData.salaryRange,
          createdAt: jobData.createdAt,
          dueDate: jobData.dueDate,
          appliedDate: jobData.dateApplied,
          description: jobData.jobDescription,
          jobType: jobData.type,
          userId: mockUser.id,
          jobUrl: jobData.jobUrl,
          applied: jobData.applied,
          resumeId: jobData.resume,
        },
      });
    });
    it("should handle undefined values for optional fields", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.job.create as jest.Mock).mockResolvedValue(jobData);

      const result = await addJob({
        ...jobData,
        jobUrl: undefined,
        dateApplied: undefined,
      });

      expect(prisma.job.create).toHaveBeenCalledTimes(1);
      expect(prisma.job.create).toHaveBeenCalledWith({
        data: {
          jobTitleId: jobData.title,
          companyId: jobData.company,
          locationId: jobData.location,
          statusId: jobData.status,
          jobSourceId: jobData.source,
          salaryRange: jobData.salaryRange,
          createdAt: jobData.createdAt,
          dueDate: jobData.dueDate,
          description: jobData.jobDescription,
          jobType: jobData.type,
          userId: mockUser.id,
          applied: jobData.applied,
          resumeId: jobData.resume,
        },
      });
      expect(result).toEqual({ job: jobData, success: true });
    });
    it("should handle unexpected errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      (prisma.job.create as jest.Mock).mockRejectedValue(
        new Error("Unexpected error")
      );

      await expect(addJob(jobData)).resolves.toStrictEqual({
        success: false,
        message: "Unexpected error",
      });
    });
    it("should throw error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(addJob(jobData)).resolves.toStrictEqual({
        success: false,
        message: "Not authenticated",
      });
    });
  });
  describe("updateJob", () => {
    it("should update a job successfully", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.job.update as jest.Mock).mockResolvedValue(jobData);

      const result = await updateJob(jobData);

      expect(result).toStrictEqual({ job: jobData, success: true });
      expect(prisma.job.update).toHaveBeenCalledTimes(1);
    });
    it("should handle unexpected errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      (prisma.job.update as jest.Mock).mockRejectedValue(
        new Error("Unexpected error")
      );

      await expect(updateJob(jobData)).resolves.toStrictEqual({
        success: false,
        message: "Unexpected error",
      });
    });
    it("should throw error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(updateJob(jobData)).resolves.toStrictEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should return an error if the id is not provided or no user privileges", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        updateJob({ ...jobData, id: undefined })
      ).resolves.toStrictEqual({
        success: false,
        message: "Id is not provide or no user privilages",
      });
    });
  });
  describe("updateJobStatus", () => {
    const jobData = {
      id: "job-id",
      title: "job-title-id",
      company: "company-id",
      location: "location-id",
      type: "FT",
      status: {
        id: "status-id",
        label: "Applied",
        value: "applied",
      },
      source: "source-id",
      salaryRange: "$50,000 - $70,000",
      createdAt: expect.any(Date),
      dueDate: new Date("2023-01-01"),
      dateApplied: new Date("2022-12-31"),
      jobDescription: "Job description",
      jobUrl: "https://example.com/job",
      applied: true,
      userId: mockUser.id,
    };
    it("should update a job status successfully", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.job.update as jest.Mock).mockResolvedValue(jobData);

      const result = await updateJobStatus(jobData.id, jobData.status);

      expect(result).toStrictEqual({ job: jobData, success: true });
      expect(prisma.job.update).toHaveBeenCalledTimes(1);
      expect(prisma.job.update).toHaveBeenCalledWith({
        where: {
          id: jobData.id,
          userId: mockUser.id,
        },
        data: {
          statusId: jobData.status.id,
          applied: true,
          appliedDate: expect.any(Date),
        },
      });
    });
    it("should handle unexpected errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      (prisma.job.update as jest.Mock).mockRejectedValue(
        new Error("Unexpected error")
      );

      await expect(
        updateJobStatus(jobData.id, jobData.status)
      ).resolves.toStrictEqual({
        success: false,
        message: "Unexpected error",
      });
    });
    it("should throw error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(
        updateJobStatus(jobData.id, jobData.status)
      ).resolves.toStrictEqual({
        success: false,
        message: "Not authenticated",
      });
    });
  });
  describe("deleteJobById", () => {
    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(deleteJobById("job-id")).resolves.toStrictEqual({
        success: false,
        message: "Not authenticated",
      });
    });
    it("should delete a job successfully", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.job.delete as jest.Mock).mockResolvedValue(jobData);

      const result = await deleteJobById("job-id");

      expect(result).toStrictEqual({ res: jobData, success: true });
      expect(prisma.job.delete).toHaveBeenCalledTimes(1);
      expect(prisma.job.delete).toHaveBeenCalledWith({
        where: {
          id: "job-id",
          userId: mockUser.id,
        },
      });
    });
    it("should handle unexpected errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      (prisma.job.delete as jest.Mock).mockRejectedValue(
        new Error("Unexpected error")
      );

      await expect(deleteJobById("job-id")).resolves.toStrictEqual({
        success: false,
        message: "Unexpected error",
      });
    });
  });
});
