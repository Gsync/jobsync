import { PrismaClient } from "@prisma/client";
import { runDueAutomations } from "@/lib/scheduler";
import { runAutomation, AutomationAlreadyRunningError } from "@/lib/scraper";

const prisma = new PrismaClient();

vi.mock("node-cron", () => {
  return {
    default: { schedule: vi.fn(), validate: vi.fn() },
  };
});

vi.mock("@prisma/client", () => {
  const m = {
    automation: { findMany: vi.fn() },
    automationRun: { create: vi.fn(), findFirst: vi.fn() },
  };
  return {
    PrismaClient: vi.fn(function () {
      return m;
    }),
  };
});

vi.mock("@/lib/scraper", () => {
  return {
    runAutomation: vi.fn(),
    AutomationAlreadyRunningError: class extends Error {
      constructor(id: string) {
        super(id);
        this.name = "AutomationAlreadyRunningError";
      }
    },
  };
});

describe("runDueAutomations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns early if no automations are due", async () => {
    (prisma.automation.findMany as any).mockResolvedValue([]);
    await runDueAutomations();
    
    expect(prisma.automation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "active",
          nextRunAt: expect.objectContaining({
            lte: expect.any(Date)
          })
        })
      })
    );
    expect(runAutomation).not.toHaveBeenCalled();
    expect(prisma.automationRun.create).not.toHaveBeenCalled();
  });

  it("skips automation if it has no resume", async () => {
    (prisma.automation.findMany as any).mockResolvedValue([{ id: "auto-1", resume: null }]);
    (prisma.automationRun.findFirst as any).mockResolvedValue(null);

    await runDueAutomations();

    expect(prisma.automationRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          automationId: "auto-1",
          status: "failed",
          errorMessage: "resume_missing",
        }),
      })
    );
    expect(runAutomation).not.toHaveBeenCalled();
  });

  it("skips automation if a run is already in progress (optimistic check)", async () => {
    (prisma.automation.findMany as any).mockResolvedValue([{ id: "auto-2", resume: { id: "res-1" } }]);
    (prisma.automationRun.findFirst as any).mockResolvedValue({ id: "run-1" });

    await runDueAutomations();

    expect(runAutomation).not.toHaveBeenCalled();
  });

  it("handles concurrent automation by catching AutomationAlreadyRunningError", async () => {
    (prisma.automation.findMany as any).mockResolvedValue([
      { id: "auto-3", name: "Concurrent", resume: { id: "res-1" } },
      { id: "auto-4", name: "Next", resume: { id: "res-1" } }
    ]);
    (prisma.automationRun.findFirst as any).mockResolvedValue(null);
    
    (runAutomation as any)
      .mockRejectedValueOnce(new AutomationAlreadyRunningError("auto-3"))
      .mockResolvedValueOnce({ status: "success", jobsSaved: 0 });

    await runDueAutomations();
    expect(runAutomation).toHaveBeenCalledTimes(2);
    expect(prisma.automationRun.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          automationId: "auto-3",
          status: "failed",
        }),
      })
    );
  });

  it("processes successful run", async () => {
    (prisma.automation.findMany as any).mockResolvedValue([
      { 
        id: "auto-4", 
        userId: "user-1",
        jobBoard: "greenhouse",
        matchThreshold: 80,
        resume: { id: "res-1" } 
      },
    ]);
    (prisma.automationRun.findFirst as any).mockResolvedValue(null);
    (runAutomation as any).mockResolvedValue({ status: "success", jobsSaved: 2 });

    await runDueAutomations();
    
    expect(runAutomation).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "auto-4",
        userId: "user-1",
        resumeId: "res-1",
        jobBoard: "greenhouse",
        matchThreshold: 80,
      })
    );
  });

  it("handles failed run by catching generic error and continuing", async () => {
    (prisma.automation.findMany as any).mockResolvedValue([
      { id: "auto-5", name: "Failed", resume: { id: "res-1" } },
      { id: "auto-6", name: "Continuing", resume: { id: "res-1" } },
    ]);
    (prisma.automationRun.findFirst as any).mockResolvedValue(null);
    (runAutomation as any)
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce({ status: "success", jobsSaved: 0 });

    await runDueAutomations();
    expect(runAutomation).toHaveBeenCalledTimes(2);
    
    expect(prisma.automationRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          automationId: "auto-5",
          status: "failed",
        }),
      })
    );
  });
});
