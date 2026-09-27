import { finalizeRun } from "@/lib/scraper/automation-run/finalize";
import { recordRunNotifications } from "@/lib/notifications/record";
import prisma from "@/lib/db";

vi.mock("@/lib/db", () => ({
  default: {
    automationRun: { update: vi.fn() },
    automation: { update: vi.fn(), findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/notifications/record", () => ({
  recordRunNotifications: vi.fn(),
}));

const db = prisma as any;
const data = {
  status: "completed" as const,
  jobsSearched: 1,
  jobsDeduplicated: 1,
  jobsProcessed: 1,
  jobsMatched: 1,
  jobsSaved: 1,
  boardErrors: [{ token: "t", name: "T", reason: "Board 't' returned 404" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  db.automationRun.update.mockResolvedValue({ id: "run-1", automationId: "a" });
  db.automation.findUnique.mockResolvedValue({ scheduleHour: 8 });
});

it("records notifications before the run row turns terminal", async () => {
  const order: string[] = [];
  (recordRunNotifications as any).mockImplementation(async () => {
    order.push("notify");
  });
  db.automationRun.update.mockImplementation(async () => {
    order.push("run");
    return { id: "run-1", automationId: "a" };
  });

  await finalizeRun("run-1", data);

  expect(order).toEqual(["notify", "run"]);
  expect(recordRunNotifications).toHaveBeenCalledWith("run-1", data);
});

it("does not persist boardErrors on the run row", async () => {
  await finalizeRun("run-1", data);
  expect(db.automationRun.update.mock.calls[0][0].data).not.toHaveProperty(
    "boardErrors",
  );
});

it("does not return boardErrors in the RunnerResult", async () => {
  const result = await finalizeRun("run-1", data);
  expect(result).not.toHaveProperty("boardErrors");
});
