import { render, screen } from "@testing-library/react";
import { QuestionForm } from "@/components/questions/QuestionForm";

vi.mock("@/actions/question.actions", () => ({
  createQuestion: vi.fn(),
  updateQuestion: vi.fn(),
}));
vi.mock("@/actions/tag.actions", () => ({ createTag: vi.fn() }));
vi.mock("@/components/TiptapEditor", () => ({ default: () => null }));

const react = { id: "t1", label: "React", value: "react" };

describe("QuestionForm editing", () => {
  it("adds the edited question's own tags to the pool", () => {
    const props = {
      availableTags: [],
      resetEditQuestion: vi.fn(),
      onQuestionSaved: vi.fn(),
      dialogOpen: true,
      setDialogOpen: vi.fn(),
    };
    const { rerender } = render(<QuestionForm {...props} editQuestion={null} />);
    expect(screen.queryByText("React")).not.toBeInTheDocument();
    const editQuestion = {
      id: "q1",
      question: "Why?",
      answer: "Because",
      tags: [react],
    } as never;
    rerender(<QuestionForm {...props} editQuestion={editQuestion} />);
    expect(screen.getByText("React")).toBeInTheDocument();
  });
});
