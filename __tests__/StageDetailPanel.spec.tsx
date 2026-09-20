import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StageDetailPanel } from "@/components/myjobs/job-details/timeline/StageDetailPanel";
import {
  deleteJobStage,
  setPrepQuestionAsked,
  setStageNotes,
} from "@/actions/jobStage.actions";

vi.mock("@/actions/jobStage.actions", () => ({
  setPrepQuestionAsked: vi.fn().mockResolvedValue({ success: true }),
  removeStagePrepQuestion: vi.fn().mockResolvedValue({ success: true }),
  unlinkStageInterviewer: vi.fn().mockResolvedValue({ success: true }),
  setStageNotes: vi.fn().mockResolvedValue({ success: true }),
  deleteJobStage: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/toast", () => ({
  toastActionResult: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

const interviewStage = {
  id: "st1",
  jobId: "j1",
  stageTypeId: "t-int",
  occurredAt: new Date(2026, 8, 24, 10, 0),
  isCurrent: true,
  outcome: "scheduled",
  notes: "Bring laptop",
  durationMins: 90,
  format: "On-site",
  location: "Acme HQ, Bldg 3",
  createdAt: new Date(2026, 8, 2),
  updatedAt: new Date(2026, 8, 2),
  StageType: {
    id: "t-int",
    label: "Final / Onsite Interview",
    value: "final / onsite interview",
    statusId: "s-int",
    sortOrder: 6,
    Status: { id: "s-int", label: "Interview", value: "interview" },
  },
  interviewers: [
    {
      id: "iv1",
      stageId: "st1",
      contactId: "c1",
      Contact: { id: "c1", name: "Priya Nair", title: "VP Engineering", email: null, phone: null, linkedinUrl: null, Company: null },
    },
  ],
  prepQuestions: [
    { id: "p1", stageId: "st1", questionId: "q1", asked: true, askedAt: new Date(), Question: { id: "q1", question: "Walk through your caching strategy", tags: [{ id: "tg1", label: "System Design", value: "system design", createdBy: "u1" }] } },
    { id: "p2", stageId: "st1", questionId: "q2", asked: false, askedAt: null, Question: { id: "q2", question: "Tell me about a conflict with a teammate", tags: [] } },
  ],
} as any;

const nonInterviewStage = {
  ...interviewStage,
  id: "st2",
  interviewers: [],
  prepQuestions: [],
  StageType: {
    ...interviewStage.StageType,
    label: "Applied",
    Status: { id: "s-app", label: "Applied", value: "applied" },
  },
};

const noop = () => {};

describe("StageDetailPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the stage name, the current-stage marker and the scheduled line", () => {
    render(
      <StageDetailPanel stage={interviewStage} isCurrent onEdit={noop} onLinkInterviewers={noop} onAddPrepQuestions={noop} onChanged={noop} />,
    );

    expect(screen.getByRole("heading", { name: "Final / Onsite Interview" })).toBeInTheDocument();
    expect(screen.getByText("CURRENT STAGE")).toBeInTheDocument();
    expect(screen.getByText(/Sep 24, 2026 · 10:00 AM · 90 min/)).toBeInTheDocument();
  });

  // Overview is the landing tab, so format, location, duration and outcome are
  // on screen without a click; interviewers and questions are one tab away.
  it("opens on Overview with location, format, duration and outcome", () => {
    render(
      <StageDetailPanel stage={interviewStage} isCurrent onEdit={noop} onLinkInterviewers={noop} onAddPrepQuestions={noop} onChanged={noop} />,
    );

    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("data-state", "active");
    expect(screen.getByText("Acme HQ, Bldg 3")).toBeInTheDocument();
    expect(screen.getByText("On-site")).toBeInTheDocument();
    expect(screen.getByText("90 min")).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.queryByText("Priya Nair")).toBeNull();
  });

  it("shows the linked interviewers on the Interviewer tab", async () => {
    render(
      <StageDetailPanel stage={interviewStage} isCurrent onEdit={noop} onLinkInterviewers={noop} onAddPrepQuestions={noop} onChanged={noop} />,
    );

    await userEvent.click(screen.getByRole("tab", { name: "Interviewer" }));

    expect(screen.getByText("Priya Nair")).toBeInTheDocument();
    expect(screen.getByText("VP Engineering")).toBeInTheDocument();
  });

  // The tally rides on the trigger, so the prep progress is readable from the
  // Overview tab without opening the list.
  it("carries the asked tally on the Prep List tab trigger", async () => {
    render(
      <StageDetailPanel stage={interviewStage} isCurrent onEdit={noop} onLinkInterviewers={noop} onAddPrepQuestions={noop} onChanged={noop} />,
    );

    expect(screen.getByRole("tab", { name: /Prep List 1 of 2/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /Prep List/ }));

    expect(screen.getByText("System Design")).toBeInTheDocument();
  });

  it("drops the tab row on a non-interview stage and shows the overview alone", () => {
    render(
      <StageDetailPanel stage={nonInterviewStage} isCurrent={false} onEdit={noop} onLinkInterviewers={noop} onAddPrepQuestions={noop} onChanged={noop} />,
    );

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByText(/INTERVIEWERS/)).toBeNull();
    expect(screen.queryByText(/PREP LIST/)).toBeNull();
    // Notes are a live textarea, so this is a value, not page text.
    expect(screen.getByLabelText("NOTES")).toHaveValue("Bring laptop");
  });

  // Location, format and duration are interview-only in the Add Stage dialog,
  // so a legacy row carrying them must not surface them here either.
  it("hides location, format and duration on a non-interview stage", () => {
    render(
      <StageDetailPanel stage={nonInterviewStage} isCurrent={false} onEdit={noop} onLinkInterviewers={noop} onAddPrepQuestions={noop} onChanged={noop} />,
    );

    expect(screen.queryByText("LOCATION")).toBeNull();
    expect(screen.queryByText("FORMAT")).toBeNull();
    expect(screen.queryByText("DURATION")).toBeNull();
    expect(screen.queryByText(/90 min/)).toBeNull();
    expect(screen.getByText("OUTCOME")).toBeInTheDocument();
  });

  // Nothing remounts when another stage is selected, so the tab has to be
  // reset by hand or an interview tab survives onto a stage that has none.
  it("returns to Overview when another stage is selected", async () => {
    const { rerender } = render(
      <StageDetailPanel stage={interviewStage} isCurrent onEdit={noop} onLinkInterviewers={noop} onAddPrepQuestions={noop} onChanged={noop} />,
    );

    await userEvent.click(screen.getByRole("tab", { name: "Interviewer" }));
    rerender(
      <StageDetailPanel stage={{ ...interviewStage, id: "st9" }} isCurrent onEdit={noop} onLinkInterviewers={noop} onAddPrepQuestions={noop} onChanged={noop} />,
    );

    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("data-state", "active");
  });

  it("marks a question asked inline, with no dialog and no save step", async () => {
    render(
      <StageDetailPanel stage={interviewStage} isCurrent onEdit={noop} onLinkInterviewers={noop} onAddPrepQuestions={noop} onChanged={noop} />,
    );

    await userEvent.click(screen.getByRole("tab", { name: /Prep List/ }));
    await userEvent.click(
      screen.getByRole("checkbox", { name: /Tell me about a conflict with a teammate/ }),
    );

    expect(setPrepQuestionAsked).toHaveBeenCalledWith("p2", true);
  });

  // The artboard's inline notes editor. Save appears only once the text has
  // actually changed, so the resting panel is not cluttered with dead buttons.
  it("edits notes in place, showing Save only once the text changes", async () => {
    render(
      <StageDetailPanel stage={interviewStage} isCurrent onEdit={noop} onLinkInterviewers={noop} onAddPrepQuestions={noop} onChanged={noop} />,
    );

    expect(screen.queryByRole("button", { name: "Save Changes" })).toBeNull();

    await userEvent.type(screen.getByLabelText("NOTES"), " Ask about on-call.");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(setStageNotes).toHaveBeenCalledWith(
      "st1",
      "Bring laptop Ask about on-call.",
    );
  });

  it("deletes the stage once the alert is confirmed", async () => {
    render(
      <StageDetailPanel stage={interviewStage} isCurrent onEdit={noop} onLinkInterviewers={noop} onAddPrepQuestions={noop} onChanged={noop} />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Delete Final / Onsite Interview" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(deleteJobStage).toHaveBeenCalledWith("st1");
  });

  it("does not delete when the alert is dismissed", async () => {
    render(
      <StageDetailPanel stage={interviewStage} isCurrent onEdit={noop} onLinkInterviewers={noop} onAddPrepQuestions={noop} onChanged={noop} />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Delete Final / Onsite Interview" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(deleteJobStage).not.toHaveBeenCalled();
  });

  // Deleting the current stage re-derives the job's status server-side, so
  // the alert has to say so rather than use the generic warning.
  it("warns that the status follows when the current stage is deleted", async () => {
    render(
      <StageDetailPanel stage={interviewStage} isCurrent onEdit={noop} onLinkInterviewers={noop} onAddPrepQuestions={noop} onChanged={noop} />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Delete Final / Onsite Interview" }),
    );

    expect(screen.getByText(/the job's status follows that stage/)).toBeInTheDocument();
  });

  it("uses the generic warning for a stage that is not current", async () => {
    render(
      <StageDetailPanel stage={nonInterviewStage} isCurrent={false} onEdit={noop} onLinkInterviewers={noop} onAddPrepQuestions={noop} onChanged={noop} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete Applied" }));

    expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
  });

  it("reverts the draft on Cancel without calling the action", async () => {
    render(
      <StageDetailPanel stage={interviewStage} isCurrent onEdit={noop} onLinkInterviewers={noop} onAddPrepQuestions={noop} onChanged={noop} />,
    );

    await userEvent.type(screen.getByLabelText("NOTES"), " scratch");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByLabelText("NOTES")).toHaveValue("Bring laptop");
    expect(setStageNotes).not.toHaveBeenCalled();
  });
});
