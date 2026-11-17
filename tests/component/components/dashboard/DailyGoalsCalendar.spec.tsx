import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DailyGoalsCalendar from "@/components/dashboard/DailyGoalsCalendar";
import {
  getDailyGoalValues,
  updateGoalTargets,
} from "@/actions/dailyGoals.actions";
import { toastError } from "@/lib/toast";

vi.mock("@/actions/dailyGoals.actions", () => ({
  getDailyGoalValues: vi.fn(),
  updateGoalTargets: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastActionResult: vi.fn((result, opts) => {
    if (result?.success) opts.onSuccess?.(result.data);
    else (toastError as any)(result?.message);
  }),
}));

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

describe("DailyGoalsCalendar", () => {
  const user = userEvent.setup();
  const today = "2026-10-05";

  const renderCalendar = (targets: Record<string, any> = {}) =>
    render(
      <DailyGoalsCalendar
        today={today}
        initialData={{
          values: { "2026-10-01": { jobs: 3, hours: 2.5 } },
          targets,
        }}
        initialStreaks={{ current: 2, best: 11 }}
      />,
    );
  const ok = (values: object = {}, targets: object = {}) => ({
    success: true,
    data: { values, targets },
  });

  // [summary Card, calendar Card]; the calendar is always the last one
  const cards = () =>
    Array.from(
      document.querySelectorAll<HTMLElement>(".daily-goals-calendar"),
    );
  const summary = () => within(cards()[0]);
  const calendar = () => within(cards().at(-1)!);
  const previous = () =>
    calendar().getByRole("button", { name: "Previous month" });
  const next = () => calendar().getByRole("button", { name: "Next month" });

  it("shows the current month from the initial values without fetching", () => {
    renderCalendar();
    expect(calendar().getByText("Oct 2026")).toBeInTheDocument();
    expect(
      calendar().getByText(/October 1: Jobs applied 3 of 5, Activity 2\.5 of 4 h/),
    ).toBeInTheDocument();
    expect(getDailyGoalValues).not.toHaveBeenCalled();
  });

  it("shows a legend naming both rings and their targets", () => {
    renderCalendar();
    expect(calendar().getByText("Jobs applied")).toBeInTheDocument();
    expect(calendar().getByText("Activity")).toBeInTheDocument();
    expect(calendar().getByText("4 h")).toBeInTheDocument();
  });

  it("cannot navigate into future months", () => {
    renderCalendar();
    expect(next()).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("fetches a month on first visit and caches it", async () => {
    (getDailyGoalValues as any).mockResolvedValue(
      ok({ "2026-09-10": { jobs: 5, hours: 4 } }),
    );
    renderCalendar();

    await user.click(previous());
    expect(getDailyGoalValues).toHaveBeenCalledWith("2026-09");
    expect(
      await calendar().findByText(/September 10: Jobs applied 5 of 5, Activity 4 of 4 h\. All goals met\./),
    ).toBeInTheDocument();
    expect(cards().at(-1)).not.toHaveAttribute("aria-busy");

    await user.click(next());
    await user.click(previous());
    expect(getDailyGoalValues).toHaveBeenCalledTimes(1);
  });

  it("keeps the busy state for the month on screen", async () => {
    const sep = deferred<any>();
    const aug = deferred<any>();
    (getDailyGoalValues as any)
      .mockReturnValueOnce(sep.promise)
      .mockReturnValueOnce(aug.promise);
    renderCalendar();

    await user.click(previous());
    await user.click(previous());
    expect(cards().at(-1)).toHaveAttribute("aria-busy", "true");

    // September settles while August is on screen: the dim must stay
    await act(async () => sep.resolve(ok()));
    expect(cards().at(-1)).toHaveAttribute("aria-busy", "true");

    await act(async () => aug.resolve(ok()));
    expect(cards().at(-1)).not.toHaveAttribute("aria-busy");
  });

  it("toasts a failed month and retries on the next visit", async () => {
    (getDailyGoalValues as any)
      .mockResolvedValueOnce({ success: false, message: "Boom" })
      .mockResolvedValueOnce(ok());
    renderCalendar();

    await user.click(previous());
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Boom"));
    expect(cards().at(-1)).not.toHaveAttribute("aria-busy");

    await user.click(next());
    await user.click(previous());
    expect(getDailyGoalValues).toHaveBeenCalledTimes(2);
  });

  it("shows the current month's summary above the calendar", () => {
    renderCalendar();
    expect(cards()).toHaveLength(2);
    // Oct 1 had 3 jobs, 2.5h: neither met; Oct 2–4 empty; today not met
    expect(
      summary().getByText("October 2026. Goal hit: Jobs applied 0%, Activity 0%"),
    ).toBeInTheDocument();
    // Stat rows are <dt>/<dd>: roles "term" / "definition"
    const text = (role: string) =>
      summary().getAllByRole(role).map((el) => el.textContent);
    expect(text("term")).toEqual([
      "Current streak",
      "Best streak (12 mo)",
      "Both goals met",
      "Nothing logged",
    ]);
    // Streaks from the server, then Oct 2–4 with nothing logged
    expect(text("definition")).toEqual(["2 days", "11 days", "0 days", "3 days"]);
  });

  it("shows the same streaks on an earlier month", async () => {
    (getDailyGoalValues as any).mockResolvedValue(ok());
    renderCalendar();
    await user.click(previous());
    expect(await summary().findByText("11 days")).toBeInTheDocument();
  });

  it("shows dashes when streaks failed to load", () => {
    render(
      <DailyGoalsCalendar
        today={today}
        initialData={{ values: {}, targets: {} }}
        initialStreaks={null}
      />,
    );
    expect(summary().getAllByText("—")).toHaveLength(2);
  });

  it("moves the calendar when the summary navigates", async () => {
    (getDailyGoalValues as any).mockResolvedValue(ok());
    renderCalendar();

    await user.click(
      summary().getByRole("button", { name: "Previous month" }),
    );
    expect(getDailyGoalValues).toHaveBeenCalledWith("2026-09");
    expect(calendar().getByText("Sep 2026")).toBeInTheDocument();
  });

  it("summarises a lazily loaded month once it arrives", async () => {
    const sep = deferred<any>();
    (getDailyGoalValues as any).mockReturnValueOnce(sep.promise);
    renderCalendar();

    await user.click(previous());
    // data-empty is on the package root inside the Card
    expect(cards()[0].querySelector("[data-empty]")).not.toBeNull();
    expect(cards()[0]).toHaveAttribute("aria-busy", "true");
    expect(cards()[1]).toHaveAttribute("aria-busy", "true");

    await act(async () =>
      sep.resolve(ok({ "2026-09-01": { jobs: 5, hours: 4 } })),
    );
    expect(
      summary().getByText("September 2026. Goal hit: Jobs applied 3%, Activity 3%"),
    ).toBeInTheDocument();
    expect(cards()[0]).not.toHaveAttribute("aria-busy");
    expect(cards()[1]).not.toHaveAttribute("aria-busy");
  });

  it("shows no summary for a month that failed", async () => {
    (getDailyGoalValues as any).mockResolvedValueOnce({
      success: false,
      message: "Boom",
    });
    renderCalendar();

    await user.click(previous());
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Boom"));
    expect(
      summary().getByText("September 2026. Goal hit: no data"),
    ).toBeInTheDocument();
    expect(summary().queryByText("Current streak")).not.toBeInTheDocument();
    expect(cards()[0]).not.toHaveAttribute("aria-busy");
  });

  it("shows no summary when the current month failed to load", () => {
    render(
      <DailyGoalsCalendar
        today={today}
        initialData={null}
        initialStreaks={null}
      />,
    );
    expect(
      summary().getByText("October 2026. Goal hit: no data"),
    ).toBeInTheDocument();
    expect(summary().queryByText("Nothing logged")).not.toBeInTheDocument();
    expect(getDailyGoalValues).not.toHaveBeenCalled();
  });

  it("judges the current month against its stored target", () => {
    renderCalendar({ "2026-10": { jobs: 3, hours: 2 } });
    expect(
      calendar().getByText(/October 1: Jobs applied 3 of 3, Activity 2\.5 of 2 h\. All goals met\./),
    ).toBeInTheDocument();
    expect(calendar().getByText("2 h")).toBeInTheDocument();
  });

  it("keeps an earlier month on the target it had", async () => {
    (getDailyGoalValues as any).mockResolvedValue(
      ok({ "2026-09-10": { jobs: 4, hours: 4 } }, { "2026-10": { jobs: 3, hours: 4 } }),
    );
    renderCalendar({ "2026-10": { jobs: 3, hours: 4 } });

    await user.click(previous());
    expect(
      await calendar().findByText(/September 10: Jobs applied 4 of 5, Activity 4 of 4 h$/),
    ).toBeInTheDocument();
  });

  it("shows carried targets for a month still loading", async () => {
    const sep = deferred<any>();
    (getDailyGoalValues as any).mockReturnValueOnce(sep.promise);
    renderCalendar({ "2026-03": { jobs: 2, hours: 7 } });

    await user.click(previous());
    // Sep has no entry: carried from March, not the 4 h default
    expect(calendar().getByText("7 h")).toBeInTheDocument();
  });

  const setGoals = () => calendar().getByRole("button", { name: "Set goals" });

  it("places Set goals inside the calendar", () => {
    renderCalendar();
    // data-gc-actions wraps the package's settings button
    expect(cards().at(-1)!.querySelector("[data-gc-actions]")).toContainElement(
      setGoals(),
    );
  });

  it("applies saved targets and streaks without refetching values", async () => {
    (updateGoalTargets as any).mockResolvedValue({
      success: true,
      data: {
        targets: { "2026-10": { jobs: 3, hours: 2 } },
        streaks: { current: 6, best: 11 },
      },
    });
    renderCalendar();

    await user.click(setGoals());
    const jobs = await screen.findByLabelText("Jobs applied per day");
    await user.clear(jobs);
    await user.type(jobs, "3");
    const hours = screen.getByLabelText("Activity hours per day");
    await user.clear(hours);
    await user.type(hours, "2");
    await user.click(screen.getByRole("button", { name: "Save goals" }));

    expect(
      await calendar().findByText(/October 1: Jobs applied 3 of 3, Activity 2\.5 of 2 h\. All goals met\./),
    ).toBeInTheDocument();
    // "Both goals met" is now 1 day; "6 days" is the new current streak
    expect(summary().getByText("6 days")).toBeInTheDocument();
    expect(getDailyGoalValues).not.toHaveBeenCalled();
  });

  it("hides Set goals when no targets have loaded", () => {
    render(
      <DailyGoalsCalendar today={today} initialData={null} initialStreaks={null} />,
    );
    expect(
      calendar().queryByRole("button", { name: "Set goals" }),
    ).not.toBeInTheDocument();
  });

  it("keeps saved targets when an older month fetch lands", async () => {
    const sep = deferred<any>();
    (getDailyGoalValues as any).mockReturnValueOnce(sep.promise);
    (updateGoalTargets as any).mockResolvedValue({
      success: true,
      data: {
        targets: { "2026-10": { jobs: 3, hours: 2 } },
        streaks: { current: 2, best: 11 },
      },
    });
    renderCalendar();

    await user.click(previous());
    await user.click(setGoals());
    const jobs = await screen.findByLabelText("Jobs applied per day");
    await user.clear(jobs);
    await user.type(jobs, "3");
    const hours = screen.getByLabelText("Activity hours per day");
    await user.clear(hours);
    await user.type(hours, "2");
    await user.click(screen.getByRole("button", { name: "Save goals" }));
    // This read happened before the save, so it carries the old (empty) map
    await act(async () => sep.resolve(ok()));

    await user.click(next());
    expect(
      calendar().getByText(/October 1: Jobs applied 3 of 3, Activity 2\.5 of 2 h\. All goals met\./),
    ).toBeInTheDocument();
  });
});
