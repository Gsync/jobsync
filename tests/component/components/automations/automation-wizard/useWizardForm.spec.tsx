import { act, renderHook, waitFor } from "@testing-library/react";
import { useWizardForm } from "@/components/automations/automation-wizard/useWizardForm";
import type { AutomationWithResume } from "@/models/automation.model";

vi.mock("@/actions/automation.actions", () => ({
  createAutomation: vi.fn(),
  updateAutomation: vi.fn(),
}));
vi.mock("@/lib/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

const automation: AutomationWithResume = {
  id: "automation-1",
  userId: "user-1",
  name: "Frontend roles",
  jobBoard: "lever",
  keywords: "React",
  location: "Remote",
  sourceConfig: JSON.stringify({
    lever: { companies: [{ name: "Acme", token: "acme", host: "eu" }] },
  }),
  resumeId: "00000000-0000-4000-8000-000000000001",
  matchThreshold: 75,
  scheduleHour: 12,
  nextRunAt: null,
  lastRunAt: null,
  status: "active",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  resume: { id: "00000000-0000-4000-8000-000000000001", title: "Frontend" },
};

const props = {
  open: true,
  onOpenChange: vi.fn(),
  automations: [automation],
  onSuccess: vi.fn(),
  editAutomation: null as AutomationWithResume | null,
};

describe("useWizardForm subscriptions", () => {
  it("updates navigation and review values for field and nested company changes", async () => {
    const { result } = renderHook(() => useWizardForm(props));
    expect(result.current.canGoNext()).toBe(false);

    act(() => result.current.form.setValue("name", "Remote roles"));
    expect(result.current.canGoNext()).toBe(true);
    act(() => result.current.nextStep());
    expect(result.current.canGoNext()).toBe(false);

    act(() => {
      result.current.form.setValue("sourceConfig.greenhouse.companies", [
        { name: "Acme", token: "acme" },
      ]);
    });
    expect(result.current.canGoNext()).toBe(true);
    expect(result.current.atsConfig.companies).toEqual([{ name: "Acme", token: "acme" }]);

    act(() => result.current.form.setValue("jobBoard", "ashby"));
    expect(result.current.atsKey).toBe("ashby");
    expect(result.current.canGoNext()).toBe(false);
    act(() => {
      result.current.form.setValue("sourceConfig.ashby", {
        companies: [{ name: "Ashby Co", token: "ashby-co" }],
      });
      result.current.form.setValue("resumeId", automation.resumeId);
      result.current.form.setValue("matchThreshold", 90);
      result.current.form.setValue("scheduleHour", 16);
    });
    act(() => result.current.nextStep());
    expect(result.current.canGoNext()).toBe(true);
    expect(result.current.formValues).toMatchObject({
      name: "Remote roles", jobBoard: "ashby", resumeId: automation.resumeId,
      matchThreshold: 90, scheduleHour: 16,
    });

    act(() => result.current.handleClose());
    await waitFor(() => expect(result.current.formValues.name).toBe(""));
    expect(result.current.atsKey).toBe("greenhouse");
    expect(result.current.atsConfig.companies).toEqual([]);
    expect(result.current.step).toBe(0);
  });

  it("reflects edit resets and defaults when the permanently mounted wizard reopens", () => {
    const { result, rerender } = renderHook((p) => useWizardForm(p), { initialProps: props });
    rerender({ ...props, editAutomation: automation });
    expect(result.current.formValues.name).toBe("Frontend roles");
    expect(result.current.atsKey).toBe("lever");
    expect(result.current.atsConfig.companies).toEqual([
      { name: "Acme", token: "acme", host: "eu" },
    ]);

    act(() => result.current.nextStep());
    expect(result.current.step).toBe(1);
    act(() => result.current.form.setValue("name", "Unsaved"));
    rerender({ ...props, open: false, editAutomation: automation });
    rerender({ ...props, editAutomation: automation });
    expect(result.current.formValues.name).toBe("Frontend roles");
    expect(result.current.step).toBe(0);
    rerender(props);
    expect(result.current.formValues.name).toBe("");
    expect(result.current.formValues.matchThreshold).toBe(80);
  });

  it("rejects an occupied schedule hour and advances after it changes", async () => {
    const { result } = renderHook(() => useWizardForm(props));
    for (let step = 0; step < 4; step++) {
      act(() => result.current.nextStep());
    }
    act(() => result.current.form.setValue("scheduleHour", 12));
    act(() => result.current.nextStep());
    expect(result.current.step).toBe(4);
    await waitFor(() => expect(result.current.form.formState.errors.scheduleHour?.message)
      .toContain("12:00"));

    act(() => result.current.form.setValue("scheduleHour", 13));
    act(() => result.current.nextStep());
    expect(result.current.step).toBe(5);
  });
});
