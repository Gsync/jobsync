import {
  addJob,
  createLocation,
  deleteJobById,
  getJobDetails,
  getJobsList,
  getJobSourceList,
  getStatusList,
  saveJobMatchResult,
  updateJob,
  updateJobStatus,
} from "@/actions/job.actions";
import { getMockJobDetails, getMockJobsList } from "@/lib/mock.utils";
import { JobResponse } from "@/models/job.model";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Mock the Prisma Client
vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    jobStatus: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    jobSource: {
      findMany: vi.fn(),
    },
    job: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    location: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  return { PrismaClient: vi.fn(function() { return mPrismaClient; }) };
});

vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: vi.fn(),
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
    tags: [],
  };
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe("getStatusList", () => {
    it("should return status list on successful query", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);

      const mockStatuses = [
        { id: "1", label: "Pending", value: "pending" },
        { id: "2", label: "Processing", value: "processing" },
      ];
      (prisma.jobStatus.findMany as any).mockResolvedValue(mockStatuses);

      const result = await getStatusList();
      expect(result).toEqual(mockStatuses);
    });

    it("should throw error on failure", async () => {
      const mockErrorResponse = {
        success: false,
        message: "Failed to fetch status list.",
      };
      (prisma.jobStatus.findMany as any).mockRejectedValue(
        new Error("Failed to fetch status list."),
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
      (prisma.jobSource.findMany as any).mockResolvedValue(mockData);

      const result = await getJobSourceList();

      expect(result).toEqual(mockData);
      expect(prisma.jobSource.findMany).toHaveBeenCalledTimes(1);
    });

    it("should returns failure response on error", async () => {
      (prisma.jobSource.findMany as any).mockRejectedValue(
        new Error("Failed to fetch job source list."),
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
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const { data, total } = await getMockJobsList(1, 10);
      (prisma.job.findMany as any).mockResolvedValue(data);
      (prisma.job.count as any).mockResolvedValue(total);

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
      (getCurrentUser as any).mockResolvedValue(mockUser);

      (prisma.job.findMany as any).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await getJobsList();

      expect(result).toEqual({
        success: false,
        message: "Database error",
      });
    });
    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await getJobsList();

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    describe("search functionality", () => {
      it("should build OR clause when search parameter is provided", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        const { data, total } = await getMockJobsList(1, 10);
        (prisma.job.findMany as any).mockResolvedValue(data);
        (prisma.job.count as any).mockResolvedValue(total);

        await getJobsList(1, 10, undefined, "Amazon");

        expect(prisma.job.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              userId: mockUser.id,
              OR: [
                { JobTitle: { label: { contains: "Amazon" } } },
                { Company: { label: { contains: "Amazon" } } },
                { Location: { label: { contains: "Amazon" } } },
                { description: { contains: "Amazon" } },
              ],
            }),
          }),
        );
        expect(prisma.job.count).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: [
                { JobTitle: { label: { contains: "Amazon" } } },
                { Company: { label: { contains: "Amazon" } } },
                { Location: { label: { contains: "Amazon" } } },
                { description: { contains: "Amazon" } },
              ],
            }),
          }),
        );
      });

      it("should search across job title", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, "Developer");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where.OR).toContainEqual({
          JobTitle: { label: { contains: "Developer" } },
        });
      });

      it("should search across company name", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, "Google");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where.OR).toContainEqual({
          Company: { label: { contains: "Google" } },
        });
      });

      it("should search across location", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, "Remote");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where.OR).toContainEqual({
          Location: { label: { contains: "Remote" } },
        });
      });

      it("should search across description", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, "React");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where.OR).toContainEqual({
          description: { contains: "React" },
        });
      });

      it("should combine search with filter", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, "applied", "Developer");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where).toMatchObject({
          userId: mockUser.id,
          Status: { value: "applied" },
          OR: expect.any(Array),
        });
      });

      it("should not include OR clause when search is undefined", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, undefined);

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where.OR).toBeUndefined();
      });

      it("should not include OR clause when search is empty string", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, "");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where.OR).toBeUndefined();
      });

      it("should return filtered results with correct pagination", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        const mockFilteredData = [
          {
            id: "1",
            JobTitle: { label: "Full Stack Developer" },
            Company: { label: "Amazon" },
          },
        ];
        (prisma.job.findMany as any).mockResolvedValue(mockFilteredData);
        (prisma.job.count as any).mockResolvedValue(1);

        const result = await getJobsList(1, 10, undefined, "Amazon");

        expect(result).toEqual({
          success: true,
          data: mockFilteredData,
          total: 1,
        });
      });

      it("should combine job type filter with search", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, "PT", "Developer");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where).toMatchObject({
          userId: mockUser.id,
          jobType: "PT",
          OR: expect.any(Array),
        });
      });
    });

    describe("company filter", () => {
      it("should filter by company value when companyValue is provided", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, undefined, "google");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where).toMatchObject({
          userId: mockUser.id,
          Company: { value: "google" },
        });
      });

      it("should filter by applied when appliedOnly is true", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, undefined, "google", true);

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where).toMatchObject({
          userId: mockUser.id,
          Company: { value: "google" },
          applied: true,
        });
      });

      it("should exclude Company from search OR when companyValue is set", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, "Developer", "google");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where.OR).toEqual([
          { JobTitle: { label: { contains: "Developer" } } },
          { Location: { label: { contains: "Developer" } } },
          { description: { contains: "Developer" } },
        ]);
        expect(findManyCall.where.OR).not.toContainEqual(
          { Company: { label: { contains: "Developer" } } },
        );
      });

      it("should include Company in search OR when companyValue is not set", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, "Developer");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where.OR).toContainEqual(
          { Company: { label: { contains: "Developer" } } },
        );
      });

      it("should combine company filter with status filter", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, "applied", undefined, "google", true);

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where).toMatchObject({
          userId: mockUser.id,
          Status: { value: "applied" },
          Company: { value: "google" },
          applied: true,
        });
      });

      it("should not add Company or applied when params are undefined", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10);

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where.Company).toBeUndefined();
        expect(findManyCall.where.applied).toBeUndefined();
      });
    });

    describe("title filter", () => {
      it("should filter by title value when titleValue is provided", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, undefined, undefined, undefined, "full stack developer");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where).toMatchObject({
          userId: mockUser.id,
          JobTitle: { value: "full stack developer" },
        });
      });

      it("should combine title filter with applied filter", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, undefined, undefined, true, "full stack developer");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where).toMatchObject({
          userId: mockUser.id,
          JobTitle: { value: "full stack developer" },
          applied: true,
        });
      });

      it("should exclude JobTitle from search OR when titleValue is set", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, "React", undefined, undefined, "full stack developer");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where.OR).not.toContainEqual(
          { JobTitle: { label: { contains: "React" } } },
        );
      });

      it("should include JobTitle in search OR when titleValue is not set", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, "React");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where.OR).toContainEqual(
          { JobTitle: { label: { contains: "React" } } },
        );
      });

      it("should not add JobTitle when titleValue is undefined", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10);

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where.JobTitle).toBeUndefined();
      });
    });

    describe("location filter", () => {
      it("should filter by location value when locationValue is provided", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, undefined, undefined, undefined, undefined, "remote");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where).toMatchObject({
          userId: mockUser.id,
          Location: { value: "remote" },
        });
      });

      it("should combine location filter with applied filter", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, undefined, undefined, true, undefined, "remote");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where).toMatchObject({
          userId: mockUser.id,
          Location: { value: "remote" },
          applied: true,
        });
      });

      it("should exclude Location from search OR when locationValue is set", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, "React", undefined, undefined, undefined, "remote");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where.OR).not.toContainEqual(
          { Location: { label: { contains: "React" } } },
        );
      });

      it("should include Location in search OR when locationValue is not set", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, "React");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where.OR).toContainEqual(
          { Location: { label: { contains: "React" } } },
        );
      });

      it("should not add Location when locationValue is undefined", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10);

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where.Location).toBeUndefined();
      });
    });

    describe("source filter", () => {
      it("should filter by source value when sourceValue is provided", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, undefined, undefined, undefined, undefined, undefined, "indeed");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where).toMatchObject({
          userId: mockUser.id,
          JobSource: { value: "indeed" },
        });
      });

      it("should combine source filter with applied filter", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10, undefined, undefined, undefined, true, undefined, undefined, "indeed");

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where).toMatchObject({
          userId: mockUser.id,
          JobSource: { value: "indeed" },
          applied: true,
        });
      });

      it("should not add JobSource when sourceValue is undefined", async () => {
        (getCurrentUser as any).mockResolvedValue(mockUser);
        (prisma.job.findMany as any).mockResolvedValue([]);
        (prisma.job.count as any).mockResolvedValue(0);

        await getJobsList(1, 10);

        const findManyCall = (prisma.job.findMany as any).mock
          .calls[0][0];
        expect(findManyCall.where.JobSource).toBeUndefined();
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
      (getCurrentUser as any).mockResolvedValue(null);

      await expect(getJobDetails("job123")).resolves.toStrictEqual({
        success: false,
        message: "Not authenticated",
      });
    });
  });
  it("should return job details on successful query", async () => {
    (getCurrentUser as any).mockResolvedValue(mockUser);
    const mockJob = await getMockJobDetails("2");
    (prisma.job.findUnique as any).mockResolvedValue(mockJob);

    const result = await getJobDetails("2");

    expect(result).toStrictEqual({ job: mockJob, success: true });
    expect(prisma.job.findUnique).toHaveBeenCalledWith({
      where: {
        id: "2",
        userId: "user-id",
      },
      include: {
        JobSource: true,
        JobTitle: true,
        Company: true,
        CoverLetter: true,
        Status: true,
        Location: true,
        Resume: {
          include: {
            File: true,
          },
        },
        tags: true,
      },
    });
  });

  it("should handle unexpected errors", async () => {
    (getCurrentUser as any).mockResolvedValue({ id: "user123" });

    (prisma.job.findUnique as any).mockRejectedValue(
      new Error("Unexpected error"),
    );

    await expect(getJobDetails("job123")).resolves.toStrictEqual({
      success: false,
      message: "Unexpected error",
    });
  });
  it("should throw error when user is not authenticated", async () => {
    (getCurrentUser as any).mockResolvedValue(null);

    await expect(getJobDetails("job123")).resolves.toStrictEqual({
      success: false,
      message: "Not authenticated",
    });
  });
  describe("createLocation", () => {
    it("should throw error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      await expect(createLocation("location-name")).resolves.toStrictEqual({
        success: false,
        message: "Not authenticated",
      });
    });
    it("should throw error when location name is not provided or empty", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
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
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.location.findFirst as any).mockResolvedValue(null);
      (prisma.location.create as any).mockResolvedValue(mockLocation);

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
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.location.findFirst as any).mockResolvedValue(null);
      (prisma.location.create as any).mockRejectedValue(
        new Error("Unexpected error"),
      );

      await expect(createLocation("location-name")).resolves.toStrictEqual({
        success: false,
        message: "Unexpected error",
      });
    });
  });
  describe("addJob", () => {
    it("should create a new job successfully", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.job.create as any).mockResolvedValue(jobData);

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
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.job.create as any).mockResolvedValue(jobData);

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
      (getCurrentUser as any).mockResolvedValue(mockUser);

      (prisma.job.create as any).mockRejectedValue(
        new Error("Unexpected error"),
      );

      await expect(addJob(jobData)).resolves.toStrictEqual({
        success: false,
        message: "Unexpected error",
      });
    });
    it("should throw error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      await expect(addJob(jobData)).resolves.toStrictEqual({
        success: false,
        message: "Not authenticated",
      });
    });
  });
  describe("updateJob", () => {
    it("should update a job successfully", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.job.update as any).mockResolvedValue(jobData);

      const result = await updateJob(jobData);

      expect(result).toStrictEqual({ job: jobData, success: true });
      expect(prisma.job.update).toHaveBeenCalledTimes(1);
    });
    it("should handle unexpected errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);

      (prisma.job.update as any).mockRejectedValue(
        new Error("Unexpected error"),
      );

      await expect(updateJob(jobData)).resolves.toStrictEqual({
        success: false,
        message: "Unexpected error",
      });
    });
    it("should throw error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      await expect(updateJob(jobData)).resolves.toStrictEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should return an error if the id is not provided or no user privileges", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);

      await expect(
        updateJob({ ...jobData, id: undefined }),
      ).resolves.toStrictEqual({
        success: false,
        message: "Job id is required",
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
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.job.update as any).mockResolvedValue(jobData);

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
      (getCurrentUser as any).mockResolvedValue(mockUser);

      (prisma.job.update as any).mockRejectedValue(
        new Error("Unexpected error"),
      );

      await expect(
        updateJobStatus(jobData.id, jobData.status),
      ).resolves.toStrictEqual({
        success: false,
        message: "Unexpected error",
      });
    });
    it("should throw error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      await expect(
        updateJobStatus(jobData.id, jobData.status),
      ).resolves.toStrictEqual({
        success: false,
        message: "Not authenticated",
      });
    });
  });
  describe("deleteJobById", () => {
    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      await expect(deleteJobById("job-id")).resolves.toStrictEqual({
        success: false,
        message: "Not authenticated",
      });
    });
    it("should delete a job successfully", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.job.delete as any).mockResolvedValue(jobData);

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
      (getCurrentUser as any).mockResolvedValue(mockUser);

      (prisma.job.delete as any).mockRejectedValue(
        new Error("Unexpected error"),
      );

      await expect(deleteJobById("job-id")).resolves.toStrictEqual({
        success: false,
        message: "Unexpected error",
      });
    });
  });
  describe("saveJobMatchResult", () => {
    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await saveJobMatchResult("job-id", 85, '{"summary":"test"}');

      expect(result).toStrictEqual({
        success: false,
        message: "Not authenticated",
      });
      expect(prisma.job.update).not.toHaveBeenCalled();
    });

    it("should save match score and data successfully", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.job.update as any).mockResolvedValue({});

      const matchData = JSON.stringify({
        matchScore: 85,
        summary: "Good match",
        resumeId: "resume-1",
        resumeTitle: "My Resume",
        matchedAt: "2026-03-29T00:00:00.000Z",
      });

      const result = await saveJobMatchResult("job-id", 85, matchData);

      expect(result).toStrictEqual({ success: true });
      expect(prisma.job.update).toHaveBeenCalledTimes(1);
      expect(prisma.job.update).toHaveBeenCalledWith({
        where: { id: "job-id", userId: mockUser.id },
        data: { matchScore: 85, matchData },
      });
    });

    it("should handle database errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.job.update as any).mockRejectedValue(
        new Error("Record not found"),
      );

      const result = await saveJobMatchResult("job-id", 75, '{}');

      expect(result).toStrictEqual({
        success: false,
        message: "Record not found",
      });
    });
  });
});
