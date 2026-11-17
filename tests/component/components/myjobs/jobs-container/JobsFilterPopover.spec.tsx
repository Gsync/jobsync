import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JobsFilterPopover } from "@/components/myjobs/jobs-container/JobsFilterPopover";
import { getJobFilterCounts } from "@/actions/job.actions";
import { EMPTY_JOB_FACETS } from "@/lib/jobs/jobFacets";

vi.mock("@/actions/job.actions", () => ({
  getJobFilterCounts: vi.fn(),
}));

const statuses = [
  { id: "s-rejected", label: "Rejected", value: "rejected" },
  { id: "s-applied", label: "Applied", value: "applied" },
  { id: "s-interview", label: "Interview", value: "interview" },
];

const counts = (total: number) => ({
  success: true,
  data: {
    total,
    statusCounts: { "s-applied": 11, "s-interview": 4, "s-rejected": 21 },
    acceptedDiscovered: 7,
  },
});

describe("JobsFilterPopover", () => {
  const user = userEvent.setup({ delay: null });
  const onApply = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    (getJobFilterCounts as any).mockResolvedValue(counts(18));
  });

  afterEach(() => vi.useRealTimers());

  const renderPopover = (facets = EMPTY_JOB_FACETS) =>
    render(
      <JobsFilterPopover
        statuses={statuses}
        facets={facets}
        search=""
        scope={{}}
        onApply={onApply}
      />,
    );

  const open = async () => {
    await user.click(screen.getByRole("button", { name: /^Filter jobs/ }));
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
  };

  it("lists statuses in JOB_STATUSES order with their counts", async () => {
    renderPopover();
    await open();
    const labels = screen
      .getAllByRole("checkbox")
      .map((box) => box.getAttribute("aria-label"));
    expect(labels.slice(0, 3)).toEqual(["Applied", "Interview", "Rejected"]);
    expect(labels).toContain("Accepted (discovered)");
    expect(labels).toContain("Include dismissed discovered jobs");
    await waitFor(() => expect(screen.getByText("21")).toBeInTheDocument());
  });

  it("shows the live total on the apply button", async () => {
    renderPopover();
    await open();
    expect(
      await screen.findByRole("button", { name: "Show 18 jobs" }),
    ).toBeInTheDocument();
  });

  it("applies the draft only on Show N jobs", async () => {
    renderPopover();
    await open();
    await user.click(screen.getByRole("checkbox", { name: "Applied" }));
    await user.click(screen.getByRole("button", { name: "Remote" }));
    expect(onApply).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await user.click(await screen.findByRole("button", { name: /^Show \d+ jobs?$/ }));
    expect(onApply).toHaveBeenCalledWith({
      ...EMPTY_JOB_FACETS,
      statuses: ["applied"],
      workplaces: ["REMOTE"],
    });
  });

  it("sends the draft, not the applied facets, to the count query", async () => {
    renderPopover();
    await open();
    await user.click(screen.getByRole("button", { name: "Contract" }));
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await waitFor(() =>
      expect(getJobFilterCounts).toHaveBeenLastCalledWith(
        { ...EMPTY_JOB_FACETS, jobTypes: ["C"] },
        "",
        {},
      ),
    );
  });

  it("discards the draft when closed without applying", async () => {
    renderPopover();
    await open();
    await user.click(screen.getByRole("checkbox", { name: "Applied" }));
    await user.keyboard("{Escape}");
    await open();
    expect(screen.getByRole("checkbox", { name: "Applied" })).not.toBeChecked();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("drops the old counts when reopened", async () => {
    renderPopover();
    await open();
    expect(
      await screen.findByRole("button", { name: "Show 18 jobs" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: /^Filter jobs/ }));
    expect(screen.getByRole("button", { name: "Show jobs" })).toBeInTheDocument();
  });

  it("drops a count reply that lands after the popover closed", async () => {
    let resolveLate: (value: unknown) => void = () => {};
    (getJobFilterCounts as any).mockReturnValueOnce(
      new Promise((resolve) => (resolveLate = resolve)),
    );
    renderPopover();
    await open();
    await user.keyboard("{Escape}");
    await act(async () => resolveLate(counts(42)));
    await user.click(screen.getByRole("button", { name: /^Filter jobs/ }));
    expect(screen.getByRole("button", { name: "Show jobs" })).toBeInTheDocument();
  });

  it("seeds the draft from the applied facets on open", async () => {
    renderPopover({ ...EMPTY_JOB_FACETS, statuses: ["interview"] });
    await open();
    expect(screen.getByRole("checkbox", { name: "Interview" })).toBeChecked();
  });

  it("Select all ticks every status row, then reads Clear", async () => {
    renderPopover();
    await open();
    await user.click(screen.getByRole("button", { name: "Select all" }));
    expect(screen.getByRole("checkbox", { name: "Applied" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Accepted (discovered)" }),
    ).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByRole("checkbox", { name: "Applied" })).not.toBeChecked();
  });

  it("Clear all in the footer empties the draft without applying", async () => {
    renderPopover({ ...EMPTY_JOB_FACETS, jobTypes: ["FT"] });
    await open();
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByRole("button", { name: "Full-time" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(onApply).not.toHaveBeenCalled();
  });

  it("shows the active count on the trigger badge", () => {
    renderPopover({
      ...EMPTY_JOB_FACETS,
      statuses: ["applied", "interview"],
      jobTypes: ["FT"],
      workplaces: ["REMOTE"],
    });
    expect(
      screen.getByRole("button", { name: "Filter jobs, 4 active" }),
    ).toBeInTheDocument();
  });

  it("ignores a slower count for an older draft", async () => {
    let resolveOld: (value: unknown) => void = () => {};
    (getJobFilterCounts as any)
      .mockResolvedValueOnce(counts(18))
      .mockReturnValueOnce(new Promise((resolve) => (resolveOld = resolve)))
      .mockResolvedValueOnce(counts(3));
    renderPopover();
    await open();
    await user.click(screen.getByRole("checkbox", { name: "Applied" }));
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await user.click(screen.getByRole("checkbox", { name: "Interview" }));
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(await screen.findByRole("button", { name: "Show 3 jobs" })).toBeInTheDocument();
    await act(async () => resolveOld(counts(99)));
    expect(screen.getByRole("button", { name: "Show 3 jobs" })).toBeInTheDocument();
  });

  it("falls back to Show jobs when the count fails", async () => {
    (getJobFilterCounts as any).mockResolvedValue({ success: false, message: "x" });
    renderPopover();
    await open();
    expect(await screen.findByRole("button", { name: "Show jobs" })).toBeInTheDocument();
  });
});
