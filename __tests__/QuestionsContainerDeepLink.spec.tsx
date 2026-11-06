import { act, render, screen } from "@testing-library/react";
import QuestionsContainer from "@/components/questions/QuestionsContainer";

const replace = vi.fn();
const router = { replace };
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
}));
vi.mock("@/actions/question.actions", () => ({
  deleteQuestion: vi.fn(),
  getPrepStageLabel: vi.fn(),
  getQuestionById: vi.fn(),
  getQuestionsList: vi.fn(async () => ({ success: true, data: [], total: 0 })),
}));
vi.mock("@/components/questions/QuestionList", () => ({
  QuestionList: () => null,
}));
vi.mock("@/components/questions/QuestionForm", () => ({
  QuestionForm: ({
    dialogOpen,
    setDialogOpen,
  }: {
    dialogOpen: boolean;
    setDialogOpen: (open: boolean) => void;
  }) => (
    <div data-testid="question-form">
      {dialogOpen ? "open" : "closed"}
      <button onClick={() => setDialogOpen(false)}>close form</button>
    </div>
  ),
}));

describe("QuestionsContainer ?add-question=true", () => {
  it("opens the form once and strips the param", async () => {
    searchParams = new URLSearchParams("add-question=true&x=1");
    const { rerender } = render(<QuestionsContainer availableTags={[]} />);
    expect(await screen.findByTestId("question-form")).toHaveTextContent(
      "open",
    );
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("?x=1");

    act(() => screen.getByText("close form").click());
    expect(screen.getByTestId("question-form")).toHaveTextContent("closed");
    rerender(<QuestionsContainer availableTags={[]} />);
    expect(screen.getByTestId("question-form")).toHaveTextContent("closed");
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("stays closed without the param", async () => {
    searchParams = new URLSearchParams();
    render(<QuestionsContainer availableTags={[]} />);
    expect(await screen.findByTestId("question-form")).toHaveTextContent(
      "closed",
    );
    expect(replace).not.toHaveBeenCalled();
  });
});
