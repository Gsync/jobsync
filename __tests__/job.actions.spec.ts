import {
  getJobDetails,
  getJobsList,
  getJobSourceList,
  getStatusList,
} from "@/actions/job.actions";
import { getMockJobDetails, getMockJobsList } from "@/lib/mock.utils";
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
    },
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

jest.mock("@/utils/user.utils", () => ({
  getCurrentUser: jest.fn(),
}));

describe("getStatusList", () => {
  const mockUser = { id: "user-id" };
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
  test("getJobDetails: should throw error when user is not authenticated", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    await expect(getJobDetails("job123")).resolves.toStrictEqual({
      success: false,
      message: "Not authenticated",
    });
  });
});
