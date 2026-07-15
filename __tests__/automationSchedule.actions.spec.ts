import { createAutomation, updateAutomation } from "@/actions/automation.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    automation: {
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    resume: {
      findFirst: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(function () {
      return mPrismaClient;
    }),
  };
});

vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: vi.fn(),
}));

// syncSchedulerState boots node-cron and hits the DB; stub it out.
vi.mock("@/lib/scheduler", () => ({
  syncSchedulerState: vi.fn(),
}));

const RESUME_ID = "11111111-1111-4111-8111-111111111111";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Automation",
    jobBoard: "jsearch",
    keywords: "engineer",
    location: "New York",
    resumeId: RESUME_ID,
    matchThreshold: 80,
    scheduleHour: 8,
    ...overrides,
  } as any;
}

describe("createAutomation schedule-hour uniqueness", () => {
  const mockUser = { id: "user-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.automation.count as any).mockResolvedValue(1);
    (prisma.resume.findFirst as any).mockResolvedValue({ id: RESUME_ID });
    (prisma.automation.create as any).mockResolvedValue({ id: "auto-1" });
  });

  it("rejects a create when another automation already uses the same hour", async () => {
    (prisma.automation.findFirst as any).mockResolvedValue({ id: "other" });

    const result = await createAutomation(baseInput());

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/08:00/);
    expect(prisma.automation.create).not.toHaveBeenCalled();
  });

  it("scopes the clash check to the current user and chosen hour", async () => {
    (prisma.automation.findFirst as any).mockResolvedValue(null);

    await createAutomation(baseInput({ scheduleHour: 14 }));

    const where = (prisma.automation.findFirst as any).mock.calls[0][0].where;
    expect(where).toMatchObject({ userId: "user-1", scheduleHour: 14 });
  });

  it("creates the automation when the hour is free", async () => {
    (prisma.automation.findFirst as any).mockResolvedValue(null);

    const result = await createAutomation(baseInput());

    expect(result.success).toBe(true);
    expect(prisma.automation.create).toHaveBeenCalled();
  });
});

describe("updateAutomation schedule-hour uniqueness", () => {
  const mockUser = { id: "user-1" };
  const AUTO_ID = "auto-1";

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.resume.findFirst as any).mockResolvedValue({ id: RESUME_ID });
    (prisma.automation.update as any).mockResolvedValue({ id: AUTO_ID });
  });

  it("rejects when another automation already uses the target hour", async () => {
    (prisma.automation.findFirst as any)
      .mockResolvedValueOnce({ id: AUTO_ID, scheduleHour: 8 }) // ownership lookup
      .mockResolvedValueOnce({ id: "sibling" }); // clash check

    const result = await updateAutomation(AUTO_ID, baseInput({ scheduleHour: 9 }));

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/09:00/);
    expect(prisma.automation.update).not.toHaveBeenCalled();
  });

  it("excludes the automation being edited from the clash query", async () => {
    (prisma.automation.findFirst as any)
      .mockResolvedValueOnce({ id: AUTO_ID, scheduleHour: 8 })
      .mockResolvedValueOnce(null);

    await updateAutomation(AUTO_ID, baseInput({ scheduleHour: 8 }));

    const clashWhere = (prisma.automation.findFirst as any).mock.calls[1][0].where;
    expect(clashWhere).toMatchObject({
      userId: "user-1",
      scheduleHour: 8,
      id: { not: AUTO_ID },
    });
  });

  it("updates when no other automation uses the hour", async () => {
    (prisma.automation.findFirst as any)
      .mockResolvedValueOnce({ id: AUTO_ID, scheduleHour: 8 })
      .mockResolvedValueOnce(null);

    const result = await updateAutomation(AUTO_ID, baseInput({ scheduleHour: 10 }));

    expect(result.success).toBe(true);
    expect(prisma.automation.update).toHaveBeenCalled();
  });
});
