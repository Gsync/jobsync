import { act, renderHook } from "@testing-library/react";
import { useAutomationRun } from "@/components/automations/automation-detail-container/useAutomationRun";

const refresh = vi.fn();
vi.mock("@/context/NotificationContext", () => ({
  useNotifications: () => ({ refresh }),
}));
vi.mock("@/actions/automation.actions", () => ({ getAutomationRuns: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toastSuccess: vi.fn(), toastError: vi.fn() }));

class FakeEventSource {
  static last: FakeEventSource;
  onmessage: ((e: { data: string }) => void) | null = null;
  constructor() {
    FakeEventSource.last = this;
  }
  close() {}
}

beforeEach(() => {
  vi.stubGlobal("EventSource", FakeEventSource);
});
afterEach(() => vi.unstubAllGlobals());

const emit = (data: object) =>
  act(() => FakeEventSource.last.onmessage?.({ data: JSON.stringify(data) }));

// The stream reports done before finalizeRun writes the notifications.
it("does not refresh notifications when only the log stream reports the end", () => {
  renderHook(() =>
    useAutomationRun({
      automationId: "a1",
      automation: null,
      latestRunId: null,
      loadData: vi.fn().mockResolvedValue(undefined),
      refreshJobs: vi.fn().mockResolvedValue(undefined),
    }),
  );
  emit({ logs: [], isRunning: true });
  emit({ logs: [], isRunning: false, completedAt: new Date().toISOString() });
  expect(refresh).not.toHaveBeenCalled();
});
