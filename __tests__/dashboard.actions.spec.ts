import {
  getJobsAppliedForPeriod,
  getRecentJobs,
  getActivityDataForPeriod,
  getJobsActivityForPeriod,
  getActivityCalendarData,
} from "@/actions/dashboard.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Mock the Prisma Client
jest.mock("@prisma/client", () => {
  const mPrismaClient = {
    job: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    activity: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

jest.mock("@/utils/user.utils", () => ({
  getCurrentUser: jest.fn(),
}));

describe("Dashboard Actions", () => {
  const mockUser = { id: "user-id" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getJobsAppliedForPeriod", () => {
    it("should return count and trend for authenticated user", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.$transaction as jest.Mock).mockResolvedValue([10, 15]);

      const result = await getJobsAppliedForPeriod(7);

      expect(result).toEqual({ count: 10, trend: expect.any(Number) });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should throw error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(getJobsAppliedForPeriod(7)).rejects.toThrow(
        "Not authenticated",
      );
    });

    it("should calculate zero trend when both counts are zero", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.$transaction as jest.Mock).mockResolvedValue([0, 0]);

      const result = await getJobsAppliedForPeriod(7);

      expect(result).toEqual({ count: 0, trend: 0 });
    });

    it("should handle database errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.$transaction as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(getJobsAppliedForPeriod(7)).rejects.toThrow(
        "Failed to calculate job count",
      );
    });
  });

  describe("getRecentJobs", () => {
    it("should return recent jobs for authenticated user", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      const mockJobs = [
        {
          id: "job-1",
          title: "Software Engineer",
          Company: { label: "Company 1" },
          Status: { label: "Applied" },
        },
        {
          id: "job-2",
          title: "Frontend Developer",
          Company: { label: "Company 2" },
          Status: { label: "Interview" },
        },
      ];
      (prisma.job.findMany as jest.Mock).mockResolvedValue(mockJobs);

      const result = await getRecentJobs();

      expect(result).toEqual(mockJobs);
      expect(prisma.job.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          applied: true,
        },
        include: {
          JobSource: true,
          JobTitle: true,
          Company: true,
          Status: true,
          Location: true,
        },
        orderBy: {
          appliedDate: "desc",
        },
        take: APP_CONSTANTS.RECENT_NUM_JOBS_ACTIVITIES,
      });
    });

    it("should throw error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(getRecentJobs()).rejects.toThrow(
        "Failed to fetch jobs list. ",
      );
    });

    it("should handle database errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.job.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(getRecentJobs()).rejects.toThrow(
        "Failed to fetch jobs list. ",
      );
    });

    it("should return empty array when no jobs found", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.job.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getRecentJobs();

      expect(result).toEqual([]);
    });
  });

  describe("getActivityDataForPeriod", () => {
    it("should return activity data grouped by day for authenticated user", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      const mockActivities = [
        {
          endTime: new Date("2024-01-01T10:00:00Z"),
          duration: 60,
          activityType: { label: "Applying" },
        },
        {
          endTime: new Date("2024-01-01T14:00:00Z"),
          duration: 30,
          activityType: { label: "Interviewing" },
        },
      ];
      (prisma.activity.findMany as jest.Mock).mockResolvedValue(mockActivities);

      const result = await getActivityDataForPeriod();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(7);
      expect(result[0]).toHaveProperty("day");
      expect(prisma.activity.findMany).toHaveBeenCalledTimes(1);
    });

    it("should throw error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(getActivityDataForPeriod()).rejects.toThrow(
        "Failed to fetch activities data.",
      );
    });

    it("should handle database errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.activity.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(getActivityDataForPeriod()).rejects.toThrow(
        "Failed to fetch activities data.",
      );
    });

    it("should return data for all 7 days even with no activities", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getActivityDataForPeriod();

      expect(result.length).toBe(7);
      result.forEach((day: any) => {
        expect(day).toHaveProperty("day");
      });
    });

    it("should handle activities with missing activityType", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      const mockActivities = [
        {
          endTime: new Date("2024-01-01T10:00:00Z"),
          duration: 60,
          activityType: null,
        },
      ];
      (prisma.activity.findMany as jest.Mock).mockResolvedValue(mockActivities);

      const result = await getActivityDataForPeriod();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(7);
    });
  });

  describe("getJobsActivityForPeriod", () => {
    it("should return jobs activity data for authenticated user", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      const mockJobData = [
        {
          appliedDate: new Date("2024-01-01"),
          _count: { _all: 3 },
        },
        {
          appliedDate: new Date("2024-01-02"),
          _count: { _all: 5 },
        },
      ];
      (prisma.job.groupBy as jest.Mock).mockResolvedValue(mockJobData);

      const result = await getJobsActivityForPeriod();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(7);
      result.forEach((item: any) => {
        expect(item).toHaveProperty("day");
        expect(item).toHaveProperty("value");
        expect(typeof item.value).toBe("number");
      });
    });

    it("should throw error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(getJobsActivityForPeriod()).rejects.toThrow(
        "Failed to fetch jobs list. ",
      );
    });

    it("should handle database errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.job.groupBy as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(getJobsActivityForPeriod()).rejects.toThrow(
        "Failed to fetch jobs list. ",
      );
    });

    it("should return zero values for days with no jobs", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.job.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await getJobsActivityForPeriod();

      expect(result.length).toBe(7);
      result.forEach((item: any) => {
        expect(item.value).toBe(0);
      });
    });
  });

  describe("getActivityCalendarData", () => {
    it("should return calendar data grouped by year for authenticated user", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      const mockJobData = [
        {
          appliedDate: new Date("2024-01-15"),
          _count: { _all: 2 },
        },
        {
          appliedDate: new Date("2024-03-20"),
          _count: { _all: 3 },
        },
        {
          appliedDate: new Date("2023-12-10"),
          _count: { _all: 1 },
        },
      ];
      (prisma.job.groupBy as jest.Mock).mockResolvedValue(mockJobData);

      const result = await getActivityCalendarData();

      expect(typeof result).toBe("object");
      expect(prisma.job.groupBy).toHaveBeenCalledTimes(1);
    });

    it("should throw error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      await expect(getActivityCalendarData()).rejects.toThrow(
        "Failed to fetch jobs list. ",
      );
    });

    it("should handle database errors", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.job.groupBy as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(getActivityCalendarData()).rejects.toThrow(
        "Failed to fetch jobs list. ",
      );
    });

    it("should return empty object when no job data", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.job.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await getActivityCalendarData();

      expect(result).toEqual({});
    });

    it("should correctly group jobs by year", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      const mockJobData = [
        {
          appliedDate: new Date("2024-06-15"),
          _count: { _all: 2 },
        },
        {
          appliedDate: new Date("2024-06-16"),
          _count: { _all: 3 },
        },
      ];
      (prisma.job.groupBy as jest.Mock).mockResolvedValue(mockJobData);

      const result = await getActivityCalendarData();

      expect(result).toHaveProperty("2024");
      expect(Array.isArray(result["2024"])).toBe(true);
      expect(result["2024"].length).toBe(2);
      result["2024"].forEach((item: any) => {
        expect(item).toHaveProperty("day");
        expect(item).toHaveProperty("value");
      });
    });

    it("should aggregate counts for same date", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      const mockJobData = [
        {
          appliedDate: new Date("2024-06-15T10:00:00Z"),
          _count: { _all: 2 },
        },
        {
          appliedDate: new Date("2024-06-15T14:00:00Z"),
          _count: { _all: 3 },
        },
      ];
      (prisma.job.groupBy as jest.Mock).mockResolvedValue(mockJobData);

      const result = await getActivityCalendarData();

      expect(result["2024"].length).toBe(1);
      expect(result["2024"][0].value).toBe(5);
    });
  });
});
