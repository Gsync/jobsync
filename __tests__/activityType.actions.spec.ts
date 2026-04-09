import {
  getActivityTypeList,
  deleteActivityTypeById,
} from "@/actions/activity.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    activityType: {
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    activity: {
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    task: {
      count: vi.fn(),
    },
  };
  return { PrismaClient: vi.fn(function() { return mPrismaClient; }) };
});

vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: vi.fn(),
}));

describe("Activity Type Actions", () => {
  const mockUser = { id: "user-id" };

  const mockActivityTypes = [
    {
      id: "at-1",
      label: "Learning",
      value: "learning",
      _count: { Activities: 5, Tasks: 2 },
    },
    {
      id: "at-2",
      label: "Job Search",
      value: "job-search",
      _count: { Activities: 3, Tasks: 1 },
    },
    {
      id: "at-3",
      label: "Networking",
      value: "networking",
      _count: { Activities: 0, Tasks: 0 },
    },
  ];

  const mockDurationSums = [
    { activityTypeId: "at-1", _sum: { duration: 300 } },
    { activityTypeId: "at-2", _sum: { duration: 120 } },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getActivityTypeList", () => {
    it("should return paginated activity types sorted by total duration", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.activityType.count as any).mockResolvedValue(3);
      (prisma.activity.groupBy as any).mockResolvedValue(mockDurationSums);
      (prisma.activityType.findMany as any).mockResolvedValue(
        mockActivityTypes,
      );

      const result = await getActivityTypeList(1, 10);

      expect(result.total).toBe(3);
      expect(result.data).toHaveLength(3);
      expect(result.data[0].id).toBe("at-1");
      expect(result.data[0].totalDuration).toBe(300);
      expect(result.data[1].id).toBe("at-2");
      expect(result.data[1].totalDuration).toBe(120);
      expect(result.data[2].id).toBe("at-3");
      expect(result.data[2].totalDuration).toBe(0);
    });

    it("should handle pagination correctly for page 2", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.activityType.count as any).mockResolvedValue(3);
      (prisma.activity.groupBy as any).mockResolvedValue(mockDurationSums);
      (prisma.activityType.findMany as any).mockResolvedValue(
        mockActivityTypes,
      );

      const result = await getActivityTypeList(2, 2);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("at-3");
    });

    it("should return empty data when page exceeds total", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.activityType.count as any).mockResolvedValue(3);
      (prisma.activity.groupBy as any).mockResolvedValue(mockDurationSums);
      (prisma.activityType.findMany as any).mockResolvedValue(
        mockActivityTypes,
      );

      const result = await getActivityTypeList(5, 10);

      expect(result.data).toHaveLength(0);
    });

    it("should assign 0 duration for types with no completed activities", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.activityType.count as any).mockResolvedValue(3);
      (prisma.activity.groupBy as any).mockResolvedValue([]);
      (prisma.activityType.findMany as any).mockResolvedValue(
        mockActivityTypes,
      );

      const result = await getActivityTypeList(1, 10);

      result.data.forEach((at: any) => {
        expect(at.totalDuration).toBe(0);
      });
    });

    it("should only sum completed activities (endTime not null)", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.activityType.count as any).mockResolvedValue(0);
      (prisma.activity.groupBy as any).mockResolvedValue([]);
      (prisma.activityType.findMany as any).mockResolvedValue([]);

      await getActivityTypeList(1, 10);

      expect(prisma.activity.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUser.id, endTime: { not: null } },
        }),
      );
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await getActivityTypeList(1, 10);

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.activityType.findMany).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.activityType.count as any).mockRejectedValue(
        new Error("DB error"),
      );

      const result = await getActivityTypeList(1, 10);

      expect(result).toEqual({ success: false, message: "DB error" });
    });
  });

  describe("deleteActivityTypeById", () => {
    it("should delete an activity type with no linked records", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.activity.count as any).mockResolvedValue(0);
      (prisma.task.count as any).mockResolvedValue(0);
      const mockDeleted = { id: "at-3", label: "Networking", value: "networking" };
      (prisma.activityType.delete as any).mockResolvedValue(mockDeleted);

      const result = await deleteActivityTypeById("at-3");

      expect(result).toEqual({ res: mockDeleted, success: true });
      expect(prisma.activityType.delete).toHaveBeenCalledWith({
        where: { id: "at-3", createdBy: mockUser.id },
      });
    });

    it("should return error when linked to activities only", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.activity.count as any).mockResolvedValue(5);
      (prisma.task.count as any).mockResolvedValue(0);

      const result = await deleteActivityTypeById("at-1");

      expect(result).toEqual({
        success: false,
        message:
          "Activity type cannot be deleted because it is linked to 5 activity(ies).",
      });
      expect(prisma.activityType.delete).not.toHaveBeenCalled();
    });

    it("should return error when linked to tasks only", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.activity.count as any).mockResolvedValue(0);
      (prisma.task.count as any).mockResolvedValue(3);

      const result = await deleteActivityTypeById("at-1");

      expect(result).toEqual({
        success: false,
        message:
          "Activity type cannot be deleted because it is linked to 3 task(s).",
      });
      expect(prisma.activityType.delete).not.toHaveBeenCalled();
    });

    it("should return error when linked to both activities and tasks", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.activity.count as any).mockResolvedValue(5);
      (prisma.task.count as any).mockResolvedValue(3);

      const result = await deleteActivityTypeById("at-1");

      expect(result).toEqual({
        success: false,
        message:
          "Activity type cannot be deleted because it is linked to 5 activity(ies) and 3 task(s).",
      });
      expect(prisma.activityType.delete).not.toHaveBeenCalled();
    });

    it("should return error for unauthenticated user", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await deleteActivityTypeById("at-1");

      expect(result).toEqual({ success: false, message: "Not authenticated" });
      expect(prisma.activity.count).not.toHaveBeenCalled();
      expect(prisma.task.count).not.toHaveBeenCalled();
      expect(prisma.activityType.delete).not.toHaveBeenCalled();
    });

    it("should handle database errors during deletion", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.activity.count as any).mockResolvedValue(0);
      (prisma.task.count as any).mockResolvedValue(0);
      (prisma.activityType.delete as any).mockRejectedValue(
        new Error("DB error"),
      );

      const result = await deleteActivityTypeById("at-1");

      expect(result).toEqual({ success: false, message: "DB error" });
    });
  });
});
