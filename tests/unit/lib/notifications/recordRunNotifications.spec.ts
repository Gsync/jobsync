import { recordRunNotifications } from "@/lib/notifications/record";
import prisma from "@/lib/db";
import type { FinalizeData } from "@/lib/scraper/automation-run/finalize";

vi.mock("@/lib/db", () => ({
  default: {
    automationRun: { findUnique: vi.fn() },
    notification: {
      create: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("@/lib/scraper/ats/registry", () => ({
  ATS_PROVIDERS: { greenhouse: { label: "Greenhouse" } },
}));
vi.mock("@/lib/telemetry", () => ({ log: { error: vi.fn() } }));

const db = prisma as any;

const base: FinalizeData = {
  status: "completed",
  jobsSearched: 38,
  jobsDeduplicated: 30,
  jobsProcessed: 20,
  jobsMatched: 12,
  jobsSaved: 12,
};

beforeEach(() => {
  vi.clearAllMocks();
  db.automationRun.findUnique.mockResolvedValue({
    automationId: "auto-1",
    automation: { userId: "user-1", jobBoard: "greenhouse" },
  });
  db.notification.findFirst.mockResolvedValue(null);
});

const created = () =>
  db.notification.create.mock.calls.map((c: any) => ({
    ...c[0].data,
    payload: JSON.parse(c[0].data.payload),
  }));

describe("recordRunNotifications", () => {
  it("writes one run row for a clean run", async () => {
    await recordRunNotifications("run-1", base);
    expect(created()).toEqual([
      expect.objectContaining({
        userId: "user-1",
        automationId: "auto-1",
        runId: "run-1",
        kind: "run",
        payload: {
          status: "completed",
          jobsSearched: 38,
          jobsSaved: 12,
          belowThreshold: 8,
          boardsFailed: 0,
          aiError: null,
        },
      }),
    ]);
  });

  it("writes nothing for a cancelled run", async () => {
    await recordRunNotifications("run-1", { ...base, status: "cancelled" });
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it("adds a red error row when the AI went down mid-run", async () => {
    await recordRunNotifications("run-1", {
      ...base,
      status: "completed_with_errors",
      errorMessage: "AI provider (ollama) is not available.",
      aiError: "AI provider (ollama) is not available.",
    });
    expect(created().map((n: any) => n.kind)).toEqual(["run", "error"]);
    expect(created()[1].payload.reason).toBe(
      "AI provider (ollama) is not available.",
    );
  });

  it("reads the AI error from its own field, not errorMessage", async () => {
    await recordRunNotifications("run-1", {
      ...base,
      status: "completed_with_errors",
      errorMessage: "AI provider (ollama) is not available.; 1 of 3 boards unreachable",
      aiError: "AI provider (ollama) is not available.",
      boardErrors: [
        { token: "northwind", name: "Northwind", reason: "Board 'northwind' returned 404" },
      ],
    });
    const rows = created();
    expect(rows.map((n: any) => n.kind)).toEqual(["run", "error", "board"]);
    expect(rows[0].payload.aiError).toBe("AI provider (ollama) is not available.");
  });

  it("writes a board row per failed board on a partial failure", async () => {
    await recordRunNotifications("run-1", {
      ...base,
      status: "completed_with_errors",
      errorMessage: "1 of 3 boards unreachable",
      boardErrors: [
        { token: "northwind", name: "Northwind", reason: "Board 'northwind' returned 404" },
      ],
    });
    const rows = created();
    expect(rows.map((n: any) => n.kind)).toEqual(["run", "board"]);
    expect(rows[0].payload.boardsFailed).toBe(1);
    expect(rows[0].payload.aiError).toBeNull();
    expect(rows[1]).toMatchObject({
      boardToken: "northwind",
      payload: {
        provider: "Greenhouse",
        token: "northwind",
        companyName: "Northwind",
        code: "not_found",
      },
    });
  });

  it("refreshes an existing board row instead of duplicating it", async () => {
    db.notification.findFirst.mockResolvedValue({ id: "n-old" });
    await recordRunNotifications("run-2", {
      ...base,
      status: "completed_with_errors",
      boardErrors: [
        { token: "northwind", name: "Northwind", reason: "Board 'northwind' returned 404" },
      ],
    });
    expect(db.notification.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", automationId: "auto-1", kind: "board", boardToken: "northwind" },
      }),
    );
    const update = db.notification.update.mock.calls[0][0];
    expect(update.where).toEqual({ id: "n-old" });
    expect(update.data).toMatchObject({
      runId: "run-2",
      occurrences: { increment: 1 },
      readAt: null,
      dismissedAt: null,
    });
    expect(update.data.occurredAt).toBeInstanceOf(Date);
    expect(created().map((n: any) => n.kind)).toEqual(["run"]);
  });

  it("writes one error row listing every board when all boards failed", async () => {
    await recordRunNotifications("run-1", {
      ...base,
      status: "failed",
      errorMessage: "All 2 boards unreachable",
      jobsSaved: 0,
      boardErrors: [
        { token: "a", name: "A", reason: "Board 'a' returned 404" },
        { token: "b", name: "B", reason: "Board 'b' timed out" },
      ],
    });
    const rows = created();
    expect(rows.map((n: any) => n.kind)).toEqual(["error"]);
    expect(rows[0].payload.reason).toBe("All 2 boards unreachable");
    expect(rows[0].payload.boards.map((b: any) => b.code)).toEqual([
      "not_found",
      "timeout",
    ]);
    expect(db.notification.findFirst).not.toHaveBeenCalled();
  });

  it("translates runner error codes on a failed run", async () => {
    await recordRunNotifications("run-1", {
      ...base,
      status: "failed",
      errorMessage: "resume_missing",
    });
    expect(created()[0].payload.reason).toMatch(/resume/i);
  });

  it("uses blockedReason on a blocked run", async () => {
    await recordRunNotifications("run-1", {
      ...base,
      status: "blocked",
      blockedReason: "source_removed",
    });
    expect(created()[0].kind).toBe("error");
    expect(created()[0].payload.reason).toMatch(/removed/i);
  });

  it("swallows db errors so the run is never affected", async () => {
    db.notification.create.mockRejectedValue(new Error("SQLITE_BUSY"));
    await expect(recordRunNotifications("run-1", base)).resolves.toBeUndefined();
  });

  it("does nothing when the run row is gone", async () => {
    db.automationRun.findUnique.mockResolvedValue(null);
    await recordRunNotifications("run-1", base);
    expect(db.notification.create).not.toHaveBeenCalled();
  });
});
