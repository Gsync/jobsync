import { render, screen } from "@testing-library/react";
import { QuestionCard } from "@/components/questions/QuestionCard";

function renderCard(askedCount: number, createdVia: string | null = null) {
  const question = {
    id: "q-1",
    question: "What is React?",
    createdBy: "user-1",
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdVia,
    askedCount,
  };
  render(<QuestionCard question={question} onEdit={vi.fn()} onDelete={vi.fn()} />);
}

it("shows one asked round directly after the chat badge", () => {
  renderCard(1, "chat");
  expect(screen.getByText("via chat").nextElementSibling).toBe(screen.getByText("Asked 1 time"));
});

it("shows multiple asked rounds on a manually added question", () => {
  renderCard(3);
  expect(screen.getByText("Asked 3 times")).toBeInTheDocument();
});

it("omits the Asked badge when no round is marked", () => {
  renderCard(0, "chat");
  expect(screen.getByText("via chat")).toBeInTheDocument();
  expect(screen.queryByText(/^Asked /)).not.toBeInTheDocument();
});
