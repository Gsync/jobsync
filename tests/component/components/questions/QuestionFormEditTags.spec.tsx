import { render, screen } from "@testing-library/react";
import { QuestionForm } from "@/components/questions/QuestionForm";

vi.mock("@/actions/question.actions", () => ({
  createQuestion: vi.fn(),
  updateQuestion: vi.fn(),
}));
vi.mock("@/actions/tag.actions", () => ({ createTag: vi.fn() }));
const tiptap = vi.hoisted(() => vi.fn((_props: Record<string, unknown>) => null));
vi.mock("@/components/TiptapEditor", () => ({ default: tiptap }));

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

  it("answer editor gets code blocks", () => {
    render(
      <QuestionForm
        availableTags={[]}
        resetEditQuestion={vi.fn()}
        onQuestionSaved={vi.fn()}
        dialogOpen
        setDialogOpen={vi.fn()}
        editQuestion={null}
      />,
    );
    expect(tiptap.mock.lastCall?.[0]).toMatchObject({
      codeBlocks: true,
      field: { name: "answer" },
    });
  });
});
