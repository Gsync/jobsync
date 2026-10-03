import { PrismaClient } from "@prisma/client";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { handleGetTask } from "@/lib/mcp/tools/getTask";
import { handleListTasks } from "@/lib/mcp/tools/listTasks";
import {
  McpGetTaskSchema,
  McpListTasksSchema,
} from "@/models/mcp.schema";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    task: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
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
  title: "Prepare follow-up",
  description: "<p>Email &amp; schedule a call</p>",
  status: "in-progress",
  priority: 7,
  percentComplete: 25,
  dueDate: new Date("2026-10-01T15:00:00.000Z"),
  activityTypeId: "type-1",
  activityType: { id: "type-1", label: "Networking" },
  activities: [],
  createdAt: new Date("2026-09-18T10:00:00.000Z"),
  updatedAt: new Date("2026-09-18T11:00:00.000Z"),
};

function parseResult(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text);
}

describe("task MCP schemas", () => {
  it("applies active-task pagination defaults", () => {
    expect(McpListTasksSchema.parse({})).toEqual({
      statuses: ["in-progress", "needs-attention"],
      page: 1,
      limit: 25,
    });
  });

  it("accepts every task status and rejects an excessive page size", () => {
    expect(
      McpListTasksSchema.parse({
        statuses: ["in-progress", "complete", "needs-attention", "cancelled"],
      }).statuses,
    ).toHaveLength(4);
    expect(() => McpListTasksSchema.parse({ limit: 51 })).toThrow();
  });

  it("requires a task id", () => {
    expect(() => McpGetTaskSchema.parse({ taskId: "" })).toThrow();
  });
});

describe("task MCP query handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkMcpRateLimit as any).mockReturnValue({ allowed: true, resetIn: 0 });
    (prisma.task.findMany as any).mockResolvedValue([task]);
    (prisma.task.count as any).mockResolvedValue(26);
    (prisma.task.findFirst as any).mockResolvedValue(task);
  });

  it("lists only the caller's filtered tasks with pagination", async () => {
    const result = await handleListTasks(
      McpListTasksSchema.parse({
        activityType: "NETWORKING",
        search: "follow-up",
        page: 2,
        limit: 10,
      }),
      "user-1",
    );

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          status: { in: ["in-progress", "needs-attention"] },
          activityType: { value: "networking", createdBy: "user-1" },
          OR: expect.any(Array),
        }),
        skip: 10,
        take: 10,
      }),
    );
    expect(prisma.task.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ userId: "user-1" }),
    });

    expect(parseResult(result)).toEqual({
      tasks: [
        expect.objectContaining({
          id: "task-1",
          description: "Email & schedule a call",
          dueDate: "2026-10-01T15:00:00.000Z",
        }),
      ],
      pagination: {
        page: 2,
        limit: 10,
        total: 26,
        totalPages: 3,
        hasMore: true,
      },
    });
  });

  it("retrieves a task only for the caller", async () => {
    const result = await handleGetTask({ taskId: "task-1" }, "user-1");

    expect(prisma.task.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "task-1", userId: "user-1" } }),
    );
    expect(parseResult(result).task).toEqual(
      expect.objectContaining({ id: "task-1", title: "Prepare follow-up" }),
    );
  });

  it("does not reveal another user's task", async () => {
    (prisma.task.findFirst as any).mockResolvedValue(null);

    const result = await handleGetTask({ taskId: "task-1" }, "user-2");

    expect(parseResult(result)).toEqual({
      error: "task_not_found",
      taskId: "task-1",
    });
  });

  it("consumes the shared rate limit before querying", async () => {
    (checkMcpRateLimit as any).mockReturnValue({ allowed: false, resetIn: 2500 });

    const result = await handleListTasks(
      McpListTasksSchema.parse({}),
      "user-1",
    );

    expect(parseResult(result)).toEqual({
      error: "rate_limit_exceeded",
      retryAfterSeconds: 3,
    });
    expect(prisma.task.findMany).not.toHaveBeenCalled();
  });
});
