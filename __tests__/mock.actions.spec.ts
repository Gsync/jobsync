import {
  generateMockActivitiesAction,
  clearMockActivitiesAction,
  generateMockProfileDataAction,
  clearMockProfileDataAction,
} from "@/actions/mock.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

// ─── Prisma mock ──────────────────────────────────────────────────────────────
// The mock factory must cover every model accessed by mock.actions.ts.
jest.mock("@prisma/client", () => {
  const mPrismaClient = {
    activityType: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    activity: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    company: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    location: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    jobTitle: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    profile: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    resume: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    contactInfo: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    summary: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    resumeSection: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    workExperience: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    education: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    licenseOrCertification: {
      deleteMany: jest.fn(),
    },
    otherSection: {
      deleteMany: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

jest.mock("@/utils/user.utils", () => ({
  getCurrentUser: jest.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Obtain a reference to the mock Prisma instance so assertions can be made.
const prisma = new PrismaClient();

const mockUser = { id: "test-user-id", name: "Test User", email: "test@example.com" };

// Activity type rows returned by prisma.activityType.findMany
const activityTypeRows = [
  { id: "type-1", value: "Learning" },
  { id: "type-2", value: "Side Project 1" },
  { id: "type-3", value: "Side Project 2" },
  { id: "type-4", value: "Job Search" },
  { id: "type-5", value: "Interview Preparation" },
  { id: "type-6", value: "Networking" },
  { id: "type-7", value: "Coding" },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("mock.actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: mock data is enabled (test runs in NODE_ENV=test, which is not
    // "development", so we need NEXT_PUBLIC_ENABLE_MOCK_DATA=true OR force
    // isMockDataEnabled to return true via the env variable).
    process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA = "true";
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA;
  });

  // ─── generateMockActivitiesAction ──────────────────────────────────────────

  describe("generateMockActivitiesAction", () => {
    it("returns error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await generateMockActivitiesAction();

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.activityType.findMany).not.toHaveBeenCalled();
    });

    it("returns error when mock data is disabled", async () => {
      delete process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA;
      // Simulate production without env flag by temporarily clearing both guards.
      // isMockDataEnabled checks NODE_ENV === "development" || NEXT_PUBLIC_ENABLE_MOCK_DATA === "true".
      // In the test runner NODE_ENV is "test" (not "development"), so removing the
      // env var is sufficient to trigger the disabled branch.
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await generateMockActivitiesAction();

      expect(result).toEqual({
        success: false,
        message:
          "Mock data generation is only available in development mode or when NEXT_PUBLIC_ENABLE_MOCK_DATA=true",
      });
    });

    it("creates activities and returns success when all types already exist", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      // All activity types already exist — createMany should be skipped.
      (prisma.activityType.findMany as jest.Mock).mockResolvedValue(activityTypeRows);
      (prisma.activityType.createMany as jest.Mock).mockResolvedValue({ count: 0 });

      // Each prisma.activity.create call returns a stub row.
      (prisma.activity.create as jest.Mock).mockResolvedValue({
        id: "activity-id",
        activityName: "Test Activity",
      });

      const result = await generateMockActivitiesAction();

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/Generated \d+ mock activities/);
      expect(result.data).toBeInstanceOf(Array);
      expect((result.data as any[]).length).toBeGreaterThan(0);
      // createMany was NOT called because all types were already present.
      expect(prisma.activityType.createMany).not.toHaveBeenCalled();
      expect(prisma.activity.create).toHaveBeenCalled();
    });

    it("creates missing activity types before inserting activities", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      // First findMany (check existing) returns only one type.
      // Second findMany (fetch all types for the map) returns all five.
      (prisma.activityType.findMany as jest.Mock)
        .mockResolvedValueOnce([{ id: "type-1", value: "Learning" }])
        .mockResolvedValueOnce(activityTypeRows);

      (prisma.activityType.createMany as jest.Mock).mockResolvedValue({ count: 4 });
      (prisma.activity.create as jest.Mock).mockResolvedValue({ id: "activity-id" });

      const result = await generateMockActivitiesAction();

      expect(result.success).toBe(true);
      expect(prisma.activityType.createMany).toHaveBeenCalledTimes(1);
      expect(prisma.activityType.findMany).toHaveBeenCalledTimes(2);
    });

    it("handles unexpected Prisma errors gracefully", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.activityType.findMany as jest.Mock).mockRejectedValue(
        new Error("Database connection lost"),
      );

      const result = await generateMockActivitiesAction();

      expect(result).toEqual({ success: false, message: "Database connection lost" });
    });
  });

  // ─── clearMockActivitiesAction ─────────────────────────────────────────────

  describe("clearMockActivitiesAction", () => {
    it("returns error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await clearMockActivitiesAction();

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.activity.findMany).not.toHaveBeenCalled();
    });

    it("returns error when mock data is disabled", async () => {
      delete process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA;
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await clearMockActivitiesAction();

      expect(result).toEqual({
        success: false,
        message:
          "Mock data clearing is only available in development mode or when NEXT_PUBLIC_ENABLE_MOCK_DATA=true",
      });
    });

    it("deletes mock activities identified by [MOCK_DATA] marker", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const mockActivities = [
        { id: "act-1", description: "[MOCK_DATA] Learning session" },
        { id: "act-2", description: "[MOCK_DATA] Job search" },
      ];
      (prisma.activity.findMany as jest.Mock).mockResolvedValue(mockActivities);
      (prisma.activity.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await clearMockActivitiesAction();

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/Deleted 2 mock activities/);

      expect(prisma.activity.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          description: { contains: "[MOCK_DATA]" },
        },
      });
      expect(prisma.activity.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["act-1", "act-2"] } },
      });
    });

    it("returns zero deleted count when no mock activities exist", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.activity.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await clearMockActivitiesAction();

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/Deleted 0 mock activities/);
    });

    it("handles unexpected Prisma errors gracefully", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.activity.findMany as jest.Mock).mockRejectedValue(
        new Error("Disk full"),
      );

      const result = await clearMockActivitiesAction();

      expect(result).toEqual({ success: false, message: "Disk full" });
    });
  });

  // ─── generateMockProfileDataAction ────────────────────────────────────────

  describe("generateMockProfileDataAction", () => {
    const profileRow = { id: "profile-id", userId: mockUser.id };

    // Helper: set up all the Prisma mocks needed for a successful profile generation.
    function setupProfileMocksForOnePerson() {
      // company.upsert (×12 companies, but we just need it not to throw)
      (prisma.company.upsert as jest.Mock).mockResolvedValue({});
      // company.findMany returns a subset matching mock companies
      (prisma.company.findMany as jest.Mock).mockResolvedValue([
        { id: "c-amazon", value: "__mock__amazon" },
        { id: "c-spotify", value: "__mock__spotify" },
        { id: "c-uber", value: "__mock__uber" },
        { id: "c-netflix", value: "__mock__netflix" },
        { id: "c-meta", value: "__mock__meta" },
        { id: "c-microsoft", value: "__mock__microsoft" },
        { id: "c-twitter", value: "__mock__twitter" },
        { id: "c-linkedin", value: "__mock__linkedin" },
        { id: "c-salesforce", value: "__mock__salesforce" },
        { id: "c-airbnb", value: "__mock__airbnb" },
        { id: "c-google", value: "__mock__google" },
        { id: "c-apple", value: "__mock__apple" },
      ]);

      // location.upsert
      (prisma.location.upsert as jest.Mock).mockResolvedValue({});
      // location.findMany
      (prisma.location.findMany as jest.Mock).mockResolvedValue([
        { id: "l-sf", value: "__mock__san_francisco" },
        { id: "l-seattle", value: "__mock__seattle" },
        { id: "l-ny", value: "__mock__new_york" },
        { id: "l-austin", value: "__mock__austin" },
        { id: "l-boston", value: "__mock__boston" },
        { id: "l-chicago", value: "__mock__chicago" },
        { id: "l-la", value: "__mock__los_angeles" },
        { id: "l-denver", value: "__mock__denver" },
        { id: "l-toronto", value: "__mock__toronto" },
        { id: "l-vancouver", value: "__mock__vancouver" },
        { id: "l-calgary", value: "__mock__calgary" },
        { id: "l-waterloo", value: "__mock__waterloo" },
      ]);

      // jobTitle.upsert
      (prisma.jobTitle.upsert as jest.Mock).mockResolvedValue({});
      // jobTitle.findMany
      (prisma.jobTitle.findMany as jest.Mock).mockResolvedValue([
        { id: "jt-junior-fe", value: "__mock__junior_frontend_developer" },
        { id: "jt-junior-se", value: "__mock__junior_software_engineer" },
        { id: "jt-fs", value: "__mock__full_stack_developer" },
        { id: "jt-se", value: "__mock__software_engineer" },
        { id: "jt-fe", value: "__mock__frontend_developer" },
        { id: "jt-be", value: "__mock__backend_developer" },
        { id: "jt-devops", value: "__mock__devops_engineer" },
        { id: "jt-data", value: "__mock__data_engineer" },
        { id: "jt-cloud", value: "__mock__cloud_architect" },
        { id: "jt-senior-se", value: "__mock__senior_software_engineer" },
        { id: "jt-senior-fe", value: "__mock__senior_frontend_developer" },
        { id: "jt-senior-be", value: "__mock__senior_backend_developer" },
        { id: "jt-senior-fs", value: "__mock__senior_full_stack_developer" },
        { id: "jt-staff-devops", value: "__mock__staff_devops_engineer" },
        { id: "jt-principal", value: "__mock__principal_cloud_architect" },
      ]);

      // profile.findFirst returns an existing profile so create is skipped
      (prisma.profile.findFirst as jest.Mock).mockResolvedValue(profileRow);

      // All resumes are new (findFirst returns null each time)
      (prisma.resume.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.resume.create as jest.Mock).mockResolvedValue({ id: "resume-id" });
      (prisma.contactInfo.create as jest.Mock).mockResolvedValue({});
      (prisma.summary.create as jest.Mock).mockResolvedValue({ id: "summary-id" });
      (prisma.resumeSection.create as jest.Mock).mockResolvedValue({ id: "section-id" });
      (prisma.workExperience.create as jest.Mock).mockResolvedValue({});
      (prisma.education.create as jest.Mock).mockResolvedValue({});
    }

    it("returns error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await generateMockProfileDataAction();

      expect(result).toEqual({ success: false, message: "Not authenticated" });
    });

    it("returns error when mock data is disabled", async () => {
      delete process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA;
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await generateMockProfileDataAction();

      expect(result).toEqual({
        success: false,
        message:
          "Mock data generation is only available in development mode or when NEXT_PUBLIC_ENABLE_MOCK_DATA=true",
      });
    });

    it("creates profile data and returns success message", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      setupProfileMocksForOnePerson();

      const result = await generateMockProfileDataAction();

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/Generated \d+ resumes/);
      expect(prisma.company.upsert).toHaveBeenCalled();
      expect(prisma.location.upsert).toHaveBeenCalled();
      expect(prisma.jobTitle.upsert).toHaveBeenCalled();
    });

    it("skips resume creation when resume already exists", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      setupProfileMocksForOnePerson();

      // Override: all resumes already exist
      (prisma.resume.findFirst as jest.Mock).mockResolvedValue({ id: "existing-resume" });

      const result = await generateMockProfileDataAction();

      expect(result.success).toBe(true);
      // Message says 0 created and all skipped
      expect(result.message).toMatch(/0 resumes/);
      expect(prisma.resume.create).not.toHaveBeenCalled();
    });

    it("creates a new profile when none exists for the user", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      setupProfileMocksForOnePerson();

      // Override: no existing profile
      (prisma.profile.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.profile.create as jest.Mock).mockResolvedValue(profileRow);

      const result = await generateMockProfileDataAction();

      expect(result.success).toBe(true);
      expect(prisma.profile.create).toHaveBeenCalledWith({
        data: { userId: mockUser.id },
      });
    });

    it("handles Prisma errors gracefully", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.company.upsert as jest.Mock).mockRejectedValue(
        new Error("Upsert failed"),
      );

      const result = await generateMockProfileDataAction();

      expect(result).toEqual({ success: false, message: "Upsert failed" });
    });
  });

  // ─── clearMockProfileDataAction ───────────────────────────────────────────

  describe("clearMockProfileDataAction", () => {
    it("returns error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await clearMockProfileDataAction();

      expect(result).toEqual({ success: false, message: "Not authenticated" });
    });

    it("returns error when mock data is disabled", async () => {
      delete process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA;
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await clearMockProfileDataAction();

      expect(result).toEqual({
        success: false,
        message:
          "Mock data clearing is only available in development mode or when NEXT_PUBLIC_ENABLE_MOCK_DATA=true",
      });
    });

    it("deletes all related records for mock resumes and returns success", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const mockResumes = [
        {
          id: "resume-1",
          title: "[MOCK_DATA] John Doe - Full Stack Developer",
          ResumeSections: [
            { id: "section-1", summaryId: "summary-1" },
            { id: "section-2", summaryId: null },
          ],
        },
      ];

      (prisma.resume.findMany as jest.Mock).mockResolvedValue(mockResumes);
      (prisma.workExperience.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.education.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.licenseOrCertification.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.otherSection.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.resumeSection.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.summary.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.contactInfo.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.resume.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      // Best-effort cleanup of companies, locations, job titles
      (prisma.company.deleteMany as jest.Mock).mockResolvedValue({ count: 12 });
      (prisma.location.deleteMany as jest.Mock).mockResolvedValue({ count: 12 });
      (prisma.jobTitle.deleteMany as jest.Mock).mockResolvedValue({ count: 15 });

      const result = await clearMockProfileDataAction();

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/Deleted 1 resumes/);
      expect(result.message).toMatch(/12 companies/);
      expect(result.message).toMatch(/12 locations/);
      expect(result.message).toMatch(/15 job titles/);

      // Verify cascading deletes were called with the correct section IDs
      expect(prisma.workExperience.deleteMany).toHaveBeenCalledWith({
        where: { resumeSectionId: { in: ["section-1", "section-2"] } },
      });
      expect(prisma.resumeSection.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["section-1", "section-2"] } },
      });
      expect(prisma.summary.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["summary-1"] } },
      });
      expect(prisma.contactInfo.deleteMany).toHaveBeenCalledWith({
        where: { resumeId: { in: ["resume-1"] } },
      });
      expect(prisma.resume.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["resume-1"] } },
      });

      // Mock company/location/title cleanup uses MOCK_VALUE_PREFIX
      expect(prisma.company.deleteMany).toHaveBeenCalledWith({
        where: { value: { startsWith: "__mock__" }, createdBy: mockUser.id },
      });
    });

    it("returns success with zero counts when no mock resumes exist", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      (prisma.resume.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.workExperience.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.education.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.licenseOrCertification.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.otherSection.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.resumeSection.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.contactInfo.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.resume.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.company.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.location.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.jobTitle.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await clearMockProfileDataAction();

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/Deleted 0 resumes/);
    });

    it("handles Prisma errors gracefully", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.resume.findMany as jest.Mock).mockRejectedValue(
        new Error("Query timeout"),
      );

      const result = await clearMockProfileDataAction();

      expect(result).toEqual({ success: false, message: "Query timeout" });
    });
  });
});
