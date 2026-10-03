import { PrismaClient } from "@prisma/client";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { handleCompleteTask } from "@/lib/mcp/tools/completeTask";
import { handleCreateTask } from "@/lib/mcp/tools/createTask";
import { handleUpdateTask } from "@/lib/mcp/tools/updateTask";
import { plainTextToTiptapHtml } from "@/lib/tasks/description";
import { createTaskForUser } from "@/lib/tasks/mutations";
import {
  McpCompleteTaskSchema,
  McpCreateTaskSchema,
  McpUpdateTaskSchema,
} from "@/models/mcp.schema";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    task: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    activityType: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});

vi.mock("@/lib/mcp/rate-limit", () => ({
  checkMcpRateLimit: vi.fn(() => ({ allowed: true, resetIn: 0 })),
}));

const task = {
  id: "task-1",
  userId: "user-1",
  title: "Follow up",
  description: "<p>Email &amp; schedule a call</p>",
  status: "in-progress",
  priority: 5,
  percentComplete: 0,
  dueDate: null,
  activityTypeId: "type-1",
  activityType: { id: "type-1", label: "Networking" },
  createdAt: new Date("2026-09-18T10:00:00.000Z"),
  updatedAt: new Date("2026-09-18T11:00:00.000Z"),
};

function parseResult(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text);
}

describe("task MCP mutation schemas", () => {
  it("applies create defaults", () => {
    expect(McpCreateTaskSchema.parse({ title: "Follow up" })).toEqual({
      title: "Follow up",
      status: "in-progress",
      priority: 5,
      percentComplete: 0,
      dueDate: undefined,
    });
  });

  it("rejects past due dates", () => {
    expect(() =>
      McpCreateTaskSchema.parse({
        title: "Follow up",
        dueDate: "2020-01-01T00:00:00Z",
      }),
    ).toThrow("Due date cannot be in the past");
  });

  it("allows nullable fields to be cleared", () => {
    expect(
      McpUpdateTaskSchema.parse({
        taskId: "task-1",
        description: null,
        dueDate: null,
        activityType: null,
      }),
    ).toEqual({
      taskId: "task-1",
      description: null,
      dueDate: null,
      activityType: null,
    });
  });

  it("rejects no-op updates", () => {
    expect(() => McpUpdateTaskSchema.parse({ taskId: "task-1" })).toThrow(
      "At least one task field must be changed",
    );
  });

  it("validates complete_task ids", () => {
    expect(() => McpCompleteTaskSchema.parse({ taskId: "" })).toThrow();
  });
});

describe("task description conversion", () => {
  it("escapes plain text into minimal Tiptap paragraphs", () => {
    expect(plainTextToTiptapHtml('<script>"Hi" & goodbye</script>\nNext')).toBe(
      "<p>&lt;script&gt;&quot;Hi&quot; &amp; goodbye&lt;/script&gt;</p><p>Next</p>",
    );
  });

  it("preserves explicit null for clearing", () => {
    expect(plainTextToTiptapHtml(null)).toBeNull();
  });
});

describe("task MCP mutation handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkMcpRateLimit as any).mockReturnValue({ allowed: true, resetIn: 0 });
    (prisma.activityType.findFirst as any).mockResolvedValue({ id: "type-1" });
    (prisma.activityType.upsert as any).mockResolvedValue({
      id: "type-1",
      label: "Networking",
      value: "networking",
      createdBy: "user-1",
    });
    (prisma.task.findFirst as any).mockResolvedValue({ id: "task-1" });
    (prisma.task.create as any).mockResolvedValue(task);
    (prisma.task.update as any).mockResolvedValue(task);
  });

  it("creates an owned task and resolves activity labels case-insensitively", async () => {
    const result = await handleCreateTask(
      McpCreateTaskSchema.parse({
        title: "Follow up",
        description: "Email & schedule a call",
        activityType: "NETWORKING",
      }),
      "user-1",
    );

    expect(prisma.activityType.upsert).toHaveBeenCalledWith({
      where: {
        value_createdBy: { value: "networking", createdBy: "user-1" },
      },
      update: {},
      create: {
        label: "NETWORKING",
        value: "networking",
        createdBy: "user-1",
      },
    });
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          activityTypeId: "type-1",
          description: "<p>Email &amp; schedule a call</p>",
        }),
      }),
    );
    expect(parseResult(result).task.description).toBe("Email & schedule a call");
  });

  it("rejects a cross-user activity type id", async () => {
    (prisma.activityType.findFirst as any).mockResolvedValue(null);

    await expect(
      createTaskForUser("user-1", {
        title: "Follow up",
        status: "in-progress",
        priority: 5,
        percentComplete: 0,
        activityTypeId: "other-user-type",
      }),
    ).rejects.toThrow("Activity type not found");
    expect(prisma.activityType.findFirst).toHaveBeenCalledWith({
      where: { id: "other-user-type", createdBy: "user-1" },
      select: { id: true },
    });
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it("clears nullable fields without resolving a new activity type", async () => {
    await handleUpdateTask(
      McpUpdateTaskSchema.parse({
        taskId: "task-1",
        description: null,
        dueDate: null,
        activityType: null,
      }),
      "user-1",
    );

    expect(prisma.task.findFirst).toHaveBeenCalledWith({
      where: { id: "task-1", userId: "user-1" },
      select: { id: true },
    });
    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-1", userId: "user-1" },
        data: expect.objectContaining({
          description: null,
          dueDate: null,
          activityTypeId: null,
        }),
      }),
    );
    expect(prisma.activityType.upsert).not.toHaveBeenCalled();
  });

  it("sets completion to 100 when status becomes complete", async () => {
    await handleUpdateTask(
      McpUpdateTaskSchema.parse({ taskId: "task-1", status: "complete" }),
      "user-1",
    );

    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "complete", percentComplete: 100 },
      }),
    );
  });

  it("allows unrelated updates without revalidating an overdue due date", async () => {
    await handleUpdateTask(
      McpUpdateTaskSchema.parse({ taskId: "task-1", priority: 9 }),
      "user-1",
    );

    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { priority: 9 } }),
    );
  });

  it("completes status and percentage in one owned update", async () => {
    await handleCompleteTask({ taskId: "task-1" }, "user-1");

    expect(prisma.task.update).toHaveBeenCalledTimes(1);
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "task-1", userId: "user-1" },
      data: { status: "complete", percentComplete: 100 },
      include: { activityType: true },
    });
  });

  it("consumes the shared rate limit before writing", async () => {
    (checkMcpRateLimit as any).mockReturnValue({ allowed: false, resetIn: 1001 });

    const result = await handleCompleteTask({ taskId: "task-1" }, "user-1");

    expect(parseResult(result)).toEqual({
      error: "rate_limit_exceeded",
      retryAfterSeconds: 2,
    });
    expect(prisma.task.update).not.toHaveBeenCalled();
  });
});
