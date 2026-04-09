import {
  getTasksList,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTaskById,
  startActivityFromTask,
  getActivityTypesWithTaskCounts,
} from "@/actions/task.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Mock the Prisma Client
vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    task: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    activity: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    activityType: {
      findMany: vi.fn(),
    },
  };
  return { PrismaClient: vi.fn(function() { return mPrismaClient; }) };
});

vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: vi.fn(),
}));

describe("taskActions", () => {
  const mockUser = { id: "user-id" };
  const mockTask = {
    id: "task-id",
    userId: mockUser.id,
    title: "Test Task",
    description: "Test task description",
    status: "in-progress" as const,
    priority: 5,
    percentComplete: 50,
    dueDate: new Date("2026-12-31"),
    activityTypeId: "activity-type-id",
    createdAt: new Date(),
    updatedAt: new Date(),
    activityType: {
      id: "activity-type-id",
      label: "Development",
      value: "development",
    },
    activity: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTasksList", () => {
    it("should return tasks list on successful query with default parameters", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);

      const mockTasks = [mockTask];
      (prisma.task.findMany as any).mockResolvedValue(mockTasks);
      (prisma.task.count as any).mockResolvedValue(1);

      const result = await getTasksList();

      expect(result).toEqual({
        success: true,
        data: mockTasks,
        total: 1,
      });
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        include: {
          activityType: true,
          activity: {
            select: { id: true },
          },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }, { updatedAt: "desc" }],
        skip: 0,
        take: 25,
      });
      expect(prisma.task.count).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
    });

    it("should return tasks list with pagination", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);

      const mockTasks = [mockTask];
      (prisma.task.findMany as any).mockResolvedValue(mockTasks);
      (prisma.task.count as any).mockResolvedValue(25);

      const result = await getTasksList(2, 10);

      expect(result).toEqual({
        success: true,
        data: mockTasks,
        total: 25,
      });
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        include: {
          activityType: true,
          activity: {
            select: { id: true },
          },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }, { updatedAt: "desc" }],
        skip: 10,
        take: 10,
      });
    });

    it("should return tasks list with activity type filter", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);

      const mockTasks = [mockTask];
      (prisma.task.findMany as any).mockResolvedValue(mockTasks);
      (prisma.task.count as any).mockResolvedValue(1);

      const result = await getTasksList(1, 10, "activity-type-id");

      expect(result).toEqual({
        success: true,
        data: mockTasks,
        total: 1,
      });
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          activityTypeId: "activity-type-id",
        },
        include: {
          activityType: true,
          activity: {
            select: { id: true },
          },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }, { updatedAt: "desc" }],
        skip: 0,
        take: 10,
      });
    });

    it("should return tasks list with status filter", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);

      const mockTasks = [mockTask];
      (prisma.task.findMany as any).mockResolvedValue(mockTasks);
      (prisma.task.count as any).mockResolvedValue(1);

      const result = await getTasksList(1, 10, undefined, [
        "in-progress",
        "needs-attention",
      ]);

      expect(result).toEqual({
        success: true,
        data: mockTasks,
        total: 1,
      });
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          status: { in: ["in-progress", "needs-attention"] },
        },
        include: {
          activityType: true,
          activity: {
            select: { id: true },
          },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }, { updatedAt: "desc" }],
        skip: 0,
        take: 10,
      });
    });

    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await getTasksList();

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should handle database errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.task.findMany as any).mockRejectedValue(
        new Error("Database error")
      );

      const result = await getTasksList();

      expect(result).toEqual({
        success: false,
        message: "Database error",
      });
    });
  });

  describe("getTaskById", () => {
    it("should return task on successful query", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.task.findFirst as any).mockResolvedValue(mockTask);

      const result = await getTaskById("task-id");

      expect(result).toEqual({
        success: true,
        data: mockTask,
      });
      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: {
          id: "task-id",
          userId: mockUser.id,
        },
        include: {
          activityType: true,
          activity: {
            select: { id: true },
          },
        },
      });
    });

    it("should return error when task is not found", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.task.findFirst as any).mockResolvedValue(null);

      const result = await getTaskById("non-existent-id");

      expect(result).toEqual({
        success: false,
        message: "Task not found",
      });
    });

    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await getTaskById("task-id");

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should handle database errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.task.findFirst as any).mockRejectedValue(
        new Error("Database error")
      );

      const result = await getTaskById("task-id");

      expect(result).toEqual({
        success: false,
        message: "Database error",
      });
    });
  });

  describe("createTask", () => {
    const taskData = {
      title: "New Task",
      description: "New task description",
      status: "in-progress" as const,
      priority: 5,
      percentComplete: 0,
      dueDate: new Date("2026-12-31"),
      activityTypeId: "activity-type-id",
    };

    it("should create a task successfully", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.task.create as any).mockResolvedValue(mockTask);

      const result = await createTask(taskData);

      expect(result).toEqual({
        success: true,
        data: mockTask,
      });
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: {
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          percentComplete: taskData.percentComplete,
          dueDate: taskData.dueDate,
          activityTypeId: taskData.activityTypeId,
          userId: mockUser.id,
        },
        include: {
          activityType: true,
        },
      });
    });

    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await createTask(taskData);

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should handle validation errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);

      const invalidData = {
        ...taskData,
        title: "A", // Too short
      };

      const result = await createTask(invalidData);

      expect(result.success).toBe(false);
      expect(result.message).toBeTruthy();
    });

    it("should handle database errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.task.create as any).mockRejectedValue(
        new Error("Database error")
      );

      const result = await createTask(taskData);

      expect(result).toEqual({
        success: false,
        message: "Database error",
      });
    });
  });

  describe("updateTask", () => {
    const updateData = {
      id: "task-id",
      title: "Updated Task",
      description: "Updated task description",
      status: "complete" as const,
      priority: 8,
      percentComplete: 100,
      dueDate: new Date("2026-12-31"),
      activityTypeId: "activity-type-id",
    };

    it("should update a task successfully", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const updatedTask = { ...mockTask, ...updateData };
      (prisma.task.update as any).mockResolvedValue(updatedTask);

      const result = await updateTask(updateData);

      expect(result).toEqual({
        success: true,
        data: updatedTask,
      });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: {
          id: updateData.id,
          userId: mockUser.id,
        },
        data: {
          title: updateData.title,
          description: updateData.description,
          status: updateData.status,
          priority: updateData.priority,
          percentComplete: updateData.percentComplete,
          dueDate: updateData.dueDate,
          activityTypeId: updateData.activityTypeId,
        },
        include: {
          activityType: true,
        },
      });
    });

    it("should return error when task ID is missing", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);

      const dataWithoutId = { ...updateData };
      delete (dataWithoutId as any).id;

      const result = await updateTask(dataWithoutId);

      expect(result).toEqual({
        success: false,
        message: "Task ID is required for update",
      });
    });

    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await updateTask(updateData);

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should handle database errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.task.update as any).mockRejectedValue(
        new Error("Database error")
      );

      const result = await updateTask(updateData);

      expect(result).toEqual({
        success: false,
        message: "Database error",
      });
    });
  });

  describe("updateTaskStatus", () => {
    it("should update task status successfully", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const updatedTask = { ...mockTask, status: "complete" as const };
      (prisma.task.update as any).mockResolvedValue(updatedTask);

      const result = await updateTaskStatus("task-id", "complete");

      expect(result).toEqual({
        success: true,
        data: updatedTask,
      });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: {
          id: "task-id",
          userId: mockUser.id,
        },
        data: {
          status: "complete",
        },
        include: {
          activityType: true,
        },
      });
    });

    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await updateTaskStatus("task-id", "complete");

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should handle database errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.task.update as any).mockRejectedValue(
        new Error("Database error")
      );

      const result = await updateTaskStatus("task-id", "complete");

      expect(result).toEqual({
        success: false,
        message: "Database error",
      });
    });
  });

  describe("deleteTaskById", () => {
    it("should delete task successfully when no linked activity", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.task.findFirst as any).mockResolvedValue(mockTask);
      (prisma.task.delete as any).mockResolvedValue(mockTask);

      const result = await deleteTaskById("task-id");

      expect(result).toEqual({
        success: true,
      });
      expect(prisma.task.delete).toHaveBeenCalledWith({
        where: {
          id: "task-id",
          userId: mockUser.id,
        },
      });
    });

    it("should return error when task is not found", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.task.findFirst as any).mockResolvedValue(null);

      const result = await deleteTaskById("non-existent-id");

      expect(result).toEqual({
        success: false,
        message: "Task not found",
      });
    });

    it("should return error when task has linked activity", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const taskWithActivity = {
        ...mockTask,
        activity: { id: "activity-id" },
      };
      (prisma.task.findFirst as any).mockResolvedValue(taskWithActivity);

      const result = await deleteTaskById("task-id");

      expect(result).toEqual({
        success: false,
        message:
          "Cannot delete task with linked activity. Remove the activity first.",
      });
      expect(prisma.task.delete).not.toHaveBeenCalled();
    });

    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await deleteTaskById("task-id");

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should handle database errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.task.findFirst as any).mockRejectedValue(
        new Error("Database error")
      );

      const result = await deleteTaskById("task-id");

      expect(result).toEqual({
        success: false,
        message: "Database error",
      });
    });
  });

  describe("startActivityFromTask", () => {
    const mockActivity = {
      id: "activity-id",
      activityName: "Test Task",
      activityTypeId: "activity-type-id",
      userId: mockUser.id,
      startTime: expect.any(Date),
      endTime: null,
      taskId: "task-id",
      activityType: {
        id: "activity-type-id",
        label: "Development",
        value: "development",
      },
    };

    it("should start activity from task successfully", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.task.findFirst as any).mockResolvedValue(mockTask);
      (prisma.activity.findFirst as any).mockResolvedValue(null);
      (prisma.activity.create as any).mockResolvedValue(mockActivity);

      const result = await startActivityFromTask("task-id");

      expect(result).toEqual({
        success: true,
        data: mockActivity,
      });
      expect(prisma.activity.create).toHaveBeenCalledWith({
        data: {
          activityName: mockTask.title,
          activityTypeId: mockTask.activityTypeId,
          userId: mockUser.id,
          startTime: expect.any(Date),
          endTime: null,
          taskId: mockTask.id,
        },
        include: {
          activityType: true,
        },
      });
    });

    it("should return error when task is not found", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.task.findFirst as any).mockResolvedValue(null);

      const result = await startActivityFromTask("non-existent-id");

      expect(result).toEqual({
        success: false,
        message: "Task not found",
      });
    });

    it("should return error when task already has linked activity", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const taskWithActivity = {
        ...mockTask,
        activity: { id: "activity-id" },
      };
      (prisma.task.findFirst as any).mockResolvedValue(taskWithActivity);

      const result = await startActivityFromTask("task-id");

      expect(result).toEqual({
        success: false,
        message: "Task already has a linked activity.",
      });
    });

    it("should return error when task has no activity type", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const taskWithoutActivityType = {
        ...mockTask,
        activityTypeId: null,
      };
      (prisma.task.findFirst as any).mockResolvedValue(
        taskWithoutActivityType
      );

      const result = await startActivityFromTask("task-id");

      expect(result).toEqual({
        success: false,
        message: "Task must have an activity type to start an activity.",
      });
    });

    it("should return error when task status is complete", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const completedTask = {
        ...mockTask,
        status: "complete" as const,
      };
      (prisma.task.findFirst as any).mockResolvedValue(completedTask);

      const result = await startActivityFromTask("task-id");

      expect(result).toEqual({
        success: false,
        message: "Cannot start an activity from a completed or cancelled task.",
      });
    });

    it("should return error when task status is cancelled", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      const cancelledTask = {
        ...mockTask,
        status: "cancelled" as const,
      };
      (prisma.task.findFirst as any).mockResolvedValue(cancelledTask);

      const result = await startActivityFromTask("task-id");

      expect(result).toEqual({
        success: false,
        message: "Cannot start an activity from a completed or cancelled task.",
      });
    });

    it("should return error when user already has a running activity", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.task.findFirst as any).mockResolvedValue(mockTask);
      (prisma.activity.findFirst as any).mockResolvedValue({
        id: "existing-activity-id",
        endTime: null,
      });

      const result = await startActivityFromTask("task-id");

      expect(result).toEqual({
        success: false,
        message:
          "You already have a running activity. Please stop it before starting a new one.",
      });
    });

    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await startActivityFromTask("task-id");

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should handle database errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.task.findFirst as any).mockRejectedValue(
        new Error("Database error")
      );

      const result = await startActivityFromTask("task-id");

      expect(result).toEqual({
        success: false,
        message: "Database error",
      });
    });
  });

  describe("getActivityTypesWithTaskCounts", () => {
    it("should return activity types with task counts successfully", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);

      const mockActivityTypes = [
        {
          id: "type-1",
          label: "Development",
          value: "development",
          createdBy: mockUser.id,
          _count: { Tasks: 5 },
        },
        {
          id: "type-2",
          label: "Testing",
          value: "testing",
          createdBy: mockUser.id,
          _count: { Tasks: 3 },
        },
      ];
      (prisma.activityType.findMany as any).mockResolvedValue(
        mockActivityTypes
      );
      (prisma.task.count as any).mockResolvedValue(8);

      const result = await getActivityTypesWithTaskCounts();

      expect(result).toEqual({
        success: true,
        data: [
          {
            id: "type-1",
            label: "Development",
            value: "development",
            taskCount: 5,
          },
          {
            id: "type-2",
            label: "Testing",
            value: "testing",
            taskCount: 3,
          },
        ],
        totalTasks: 8,
      });
      expect(prisma.activityType.findMany).toHaveBeenCalledWith({
        where: {
          createdBy: mockUser.id,
        },
        include: {
          _count: {
            select: {
              Tasks: {
                where: {
                  status: { notIn: ["complete", "cancelled"] },
                },
              },
            },
          },
        },
      });
      expect(prisma.task.count).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          status: { notIn: ["complete", "cancelled"] },
        },
      });
    });

    it("should return error when user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const result = await getActivityTypesWithTaskCounts();

      expect(result).toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should handle database errors", async () => {
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (prisma.activityType.findMany as any).mockRejectedValue(
        new Error("Database error")
      );

      const result = await getActivityTypesWithTaskCounts();

      expect(result).toEqual({
        success: false,
        message: "Database error",
      });
    });
  });
});
