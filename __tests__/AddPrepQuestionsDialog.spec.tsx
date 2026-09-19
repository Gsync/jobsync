import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddPrepQuestionsDialog } from "@/components/myjobs/job-details/timeline/AddPrepQuestionsDialog";
import { addStagePrepQuestions } from "@/actions/jobStage.actions";
import { getQuestionsList } from "@/actions/question.actions";

vi.mock("@/actions/jobStage.actions", () => ({
  addStagePrepQuestions: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));
vi.mock("@/actions/question.actions", () => ({
  getQuestionsList: vi.fn(),
  createQuestion: vi.fn().mockResolvedValue({
    success: true,
    data: { id: "q9", question: "New one", tags: [] },
  }),
}));
vi.mock("@/actions/tag.actions", () => ({ getAllTags: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/toast", () => ({
  toastActionResult: vi.fn((res, opts) => res.success && opts.onSuccess?.()),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

const stage = {
  id: "st1",
  occurredAt: new Date(2026, 8, 24, 10, 0),
  StageType: { label: "Final / Onsite Interview", Status: { value: "interview" } },
  prepQuestions: [{ id: "p1", questionId: "q1" }],
} as any;

beforeEach(() => {
  vi.clearAllMocks();
  (getQuestionsList as any).mockResolvedValue({
    success: true,
    total: 2,
    data: [
      { id: "q1", question: "Walk through your caching strategy", tags: [{ id: "tg1", label: "System Design", value: "system design", createdBy: "u1" }] },
      { id: "q2", question: "Tell me about a conflict with a teammate", tags: [] },
    ],
  });
});

describe("AddPrepQuestionsDialog", () => {
  it("heads the dialog with the stage and explains the asked workflow", async () => {
    render(<AddPrepQuestionsDialog open stage={stage} onOpenChange={() => {}} onAdded={() => {}} />);

    expect(await screen.findByText("Final / Onsite Interview · Sep 24, 2026")).toBeInTheDocument();
    expect(
      screen.getByText(/check them off as "asked" from the Timeline tab/),
    ).toBeInTheDocument();
  });

  // The same question cannot be added twice to one stage.
  it("shows a question already on the prep list as such and does not allow selecting it", async () => {
    render(<AddPrepQuestionsDialog open stage={stage} onOpenChange={() => {}} onAdded={() => {}} />);

    const already = await screen.findByRole("checkbox", {
      name: /Walk through your caching strategy/,
    });
    expect(already).toBeDisabled();
    expect(already).toBeChecked();
  });

  it("shows a selection as a removable chip and submits it", async () => {
    render(<AddPrepQuestionsDialog open stage={stage} onOpenChange={() => {}} onAdded={() => {}} />);

    await userEvent.click(
      await screen.findByRole("checkbox", { name: /Tell me about a conflict/ }),
    );
    expect(
      screen.getByRole("button", { name: /Remove Tell me about a conflict/ }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Done — 1 question added to prep list" }),
    );

    expect(addStagePrepQuestions).toHaveBeenCalledWith("st1", ["q2"]);
  });

  it("renders the question's tags as category badges", async () => {
    render(<AddPrepQuestionsDialog open stage={stage} onOpenChange={() => {}} onAdded={() => {}} />);

    expect(await screen.findByText("System Design")).toBeInTheDocument();
  });
});
