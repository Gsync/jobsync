import { getActivitiesList } from "@/actions/activity.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

jest.mock("@prisma/client", () => {
  const mPrismaClient = {
    activity: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    activityType: {
      findMany: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

jest.mock("@/utils/user.utils", () => ({
  getCurrentUser: jest.fn(),
}));

describe("activity.actions", () => {
  const mockUser = { id: "user-id" };

  const mockActivities = [
    {
      id: "1",
      activityName: "TypeScript Learning",
      startTime: new Date("2024-06-19T09:00:00"),
      endTime: new Date("2024-06-19T10:00:00"),
      duration: 60,
      description: "Learning TypeScript advanced concepts",
      createdAt: new Date("2024-06-19"),
      activityType: { id: "1", label: "Learning", value: "learning" },
    },
    {
      id: "2",
      activityName: "Build Portfolio",
      startTime: new Date("2024-06-19T11:00:00"),
      endTime: new Date("2024-06-19T12:30:00"),
      duration: 90,
      description: "Working on portfolio website",
      createdAt: new Date("2024-06-19"),
      activityType: { id: "2", label: "Side Project", value: "side-project" },
    },
    {
      id: "3",
      activityName: "Job Search",
      startTime: new Date("2024-06-20T14:00:00"),
      endTime: new Date("2024-06-20T15:00:00"),
      duration: 60,
      description: "Applying to developer positions",
      createdAt: new Date("2024-06-20"),
      activityType: { id: "3", label: "Job Search", value: "job-search" },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getActivitiesList", () => {
    it("should retrieve activities with default parameters", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.activity.findMany as jest.Mock).mockResolvedValue(mockActivities);
      (prisma.activity.count as jest.Mock).mockResolvedValue(3);

      const result = await getActivitiesList();

      expect(result).toEqual({
        success: true,
        data: mockActivities,
        total: 3,
      });
      expect(prisma.activity.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.activity.count).toHaveBeenCalledTimes(1);
    });

    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await getActivitiesList();

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should return error when fetching data fails", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (prisma.activity.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const result = await getActivitiesList();

      expect(result).toEqual({
        success: false,
        message: "Database error",
      });
    });

    describe("search functionality", () => {
      it("should build OR clause when search parameter is provided", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.activity.count as jest.Mock).mockResolvedValue(0);

        await getActivitiesList(1, 25, "TypeScript");

        expect(prisma.activity.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              userId: mockUser.id,
              endTime: { not: null },
              OR: [
                { activityName: { contains: "TypeScript" } },
                { description: { contains: "TypeScript" } },
                { activityType: { label: { contains: "TypeScript" } } },
              ],
            }),
          })
        );
        expect(prisma.activity.count).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: [
                { activityName: { contains: "TypeScript" } },
                { description: { contains: "TypeScript" } },
                { activityType: { label: { contains: "TypeScript" } } },
              ],
            }),
          })
        );
      });

      it("should search across activity name", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.activity.count as jest.Mock).mockResolvedValue(0);

        await getActivitiesList(1, 25, "Portfolio");

        const findManyCall = (prisma.activity.findMany as jest.Mock).mock
          .calls[0][0];
        expect(findManyCall.where.OR).toContainEqual({
          activityName: { contains: "Portfolio" },
        });
      });

      it("should search across description", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.activity.count as jest.Mock).mockResolvedValue(0);

        await getActivitiesList(1, 25, "developer");

        const findManyCall = (prisma.activity.findMany as jest.Mock).mock
          .calls[0][0];
        expect(findManyCall.where.OR).toContainEqual({
          description: { contains: "developer" },
        });
      });

      it("should search across activity type label", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.activity.count as jest.Mock).mockResolvedValue(0);

        await getActivitiesList(1, 25, "Learning");

        const findManyCall = (prisma.activity.findMany as jest.Mock).mock
          .calls[0][0];
        expect(findManyCall.where.OR).toContainEqual({
          activityType: { label: { contains: "Learning" } },
        });
      });

      it("should not include OR clause when search is undefined", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.activity.count as jest.Mock).mockResolvedValue(0);

        await getActivitiesList(1, 25, undefined);

        const findManyCall = (prisma.activity.findMany as jest.Mock).mock
          .calls[0][0];
        expect(findManyCall.where.OR).toBeUndefined();
      });

      it("should not include OR clause when search is empty string", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.activity.count as jest.Mock).mockResolvedValue(0);

        await getActivitiesList(1, 25, "");

        const findManyCall = (prisma.activity.findMany as jest.Mock).mock
          .calls[0][0];
        expect(findManyCall.where.OR).toBeUndefined();
      });

      it("should return filtered results with correct pagination", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
        const mockFilteredData = [mockActivities[0]];
        (prisma.activity.findMany as jest.Mock).mockResolvedValue(
          mockFilteredData
        );
        (prisma.activity.count as jest.Mock).mockResolvedValue(1);

        const result = await getActivitiesList(1, 25, "TypeScript");

        expect(result).toEqual({
          success: true,
          data: mockFilteredData,
          total: 1,
        });
      });

      it("should apply pagination with skip and take", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.activity.count as jest.Mock).mockResolvedValue(0);

        await getActivitiesList(2, 10, "test");

        expect(prisma.activity.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 10,
            take: 10,
          })
        );
      });

      it("should order results by createdAt descending", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.activity.count as jest.Mock).mockResolvedValue(0);

        await getActivitiesList(1, 25, "test");

        expect(prisma.activity.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { createdAt: "desc" },
          })
        );
      });

      it("should only return completed activities (with endTime)", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.activity.count as jest.Mock).mockResolvedValue(0);

        await getActivitiesList(1, 25, "test");

        const findManyCall = (prisma.activity.findMany as jest.Mock).mock
          .calls[0][0];
        expect(findManyCall.where.endTime).toEqual({ not: null });
      });
    });
  });
});
