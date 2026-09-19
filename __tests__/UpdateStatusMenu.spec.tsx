import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UpdateStatusMenu } from "@/components/myjobs/job-details/timeline/UpdateStatusMenu";

const stage = (statusValue: string, label: string) =>
  ({
    id: "st1",
    StageType: { label, Status: { value: statusValue } },
  }) as any;

const jobStatuses = [
  { id: "s-int", label: "Interview", value: "interview" },
  { id: "s-off", label: "Offer", value: "offer" },
] as any;

const base = {
  jobStatuses,
  currentStatusId: "s-int",
  onChangeStatus: () => {},
  onAddStage: () => {},
  onLinkInterviewers: () => {},
  onAddPrepQuestions: () => {},
};

const open = async () =>
  userEvent.click(screen.getByRole("button", { name: /Update Status/ }));

describe("UpdateStatusMenu", () => {
  // The old ⋮ submenu moved in here, so this menu is the single answer to
  // "where is this job now".
  it("carries the status picker as its first item", async () => {
    render(
      <UpdateStatusMenu {...base} targetStage={stage("interview", "Screening")} />,
    );
    await open();

    expect(
      screen.getByRole("menuitem", { name: /Change status/ }),
    ).toBeInTheDocument();
  });

  it("enables all three items on an interview stage", async () => {
    render(
      <UpdateStatusMenu
        {...base}
        targetStage={stage("interview", "Final / Onsite Interview")}
      />,
    );
    await open();

    expect(screen.getByRole("menuitem", { name: /Add Stage/ })).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("menuitem", { name: /Link Interviewers/ })).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("menuitem", { name: /Add to Prep List/ })).not.toHaveAttribute("aria-disabled", "true");
  });

  // Disabled with a visible reason, not hidden: a menu whose items come and
  // go as you change tabs is harder to learn than one that greys out.
  it("disables the stage-scoped items with a reason on a non-interview stage", async () => {
    render(<UpdateStatusMenu {...base} targetStage={stage("applied", "Applied")} />);
    await open();

    expect(screen.getByRole("menuitem", { name: /Link Interviewers/ })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("menuitem", { name: /Add to Prep List/ })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByText(/Applied is not an interview stage/).length).toBeGreaterThan(0);
  });

  it("keeps Add Stage enabled with no stage at all", async () => {
    render(<UpdateStatusMenu {...base} targetStage={null} />);
    await open();

    expect(screen.getByRole("menuitem", { name: /Add Stage/ })).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("menuitem", { name: /Link Interviewers/ })).toHaveAttribute("aria-disabled", "true");
  });

  it("fires the handler for the item clicked", async () => {
    const onAddStage = vi.fn();
    render(
      <UpdateStatusMenu
        {...base}
        targetStage={stage("interview", "Screening")}
        onAddStage={onAddStage}
      />,
    );
    await open();
    await userEvent.click(screen.getByRole("menuitem", { name: /Add Stage/ }));

    expect(onAddStage).toHaveBeenCalled();
  });
});
