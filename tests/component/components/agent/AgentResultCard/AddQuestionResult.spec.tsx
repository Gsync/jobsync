import { render, screen } from "@testing-library/react";
import { AddQuestionResult } from "@/components/agent/AgentResultCard/AddQuestionResult";
import type { AgentAddQuestionResult } from "@/models/agent.model";
import type { SaveQuestionResult } from "@/models/question.model";

const tag = (label: string) => ({ id: `t-${label}`, label, created: false });

const items: SaveQuestionResult[] = [
  { index: 1, question: "Tell me about yourself", status: "saved", tags: [tag("Communication")], droppedTags: [] },
  { index: 2, question: "Why Postgres over Mongo?", status: "merged", mode: "append", tags: [], droppedTags: [] },
  { index: 3, question: "What is a closure?", status: "merged", mode: "replace", tags: [], droppedTags: [] },
  { index: 4, question: "Why this company?", status: "skipped", existing: { question: "Why this company?" } },
  { index: 5, question: "Describe a deploy", status: "exists", existing: { id: "q1", question: "Describe a deploy", hasAnswer: true } },
  { index: 6, question: "How do you deal with a broken deployment?", status: "similar", candidates: [] },
  { index: 7, question: "Short answer", status: "invalid", error: "Answer too short." },
  { index: 8, question: "What is Redis?", status: "failed", error: "Saving this question failed." },
  { index: 9, question: "tell me about yourself", status: "repeat", of: 1 },
];

const renderCard = (output: AgentAddQuestionResult) => render(<AddQuestionResult output={output} />);

it("lists each question under its group", () => {
  renderCard({ items });
  const groups: [string, string[]][] = [
    ["Saved", ["Tell me about yourself"]],
    ["Updated", ["Why Postgres over Mongo?", "What is a closure?"]],
    ["Already in your bank", ["Why this company?"]],
    ["Waiting on your reply", ["Describe a deploy", "How do you deal with a broken deployment?", "Short answer"]],
    ["Not saved", ["What is Redis?"]],
  ];
  for (const [heading, questions] of groups) {
    const group = screen.getByRole("group", { name: heading });
    for (const question of questions) expect(group).toHaveTextContent(question);
  }
});

it("shows tag labels under a saved question", () => {
  renderCard({ items: [items[0]!] });
  expect(screen.getByText("Communication")).toBeInTheDocument();
});

it("says whether an update added or replaced the answer", () => {
  renderCard({ items: [items[1]!, items[2]!] });
  expect(screen.getByText(/Answer added/)).toBeInTheDocument();
  expect(screen.getByText(/Answer replaced/)).toBeInTheDocument();
});

it("shows a failed item's error under Not saved", () => {
  renderCard({ items: [items[7]!] });
  expect(screen.getByRole("group", { name: "Not saved" })).toHaveTextContent("Saving this question failed.");
});

it("counts repeated questions combined", () => {
  renderCard({ items: [items[0]!, items[8]!] });
  expect(screen.getByText("1 repeated question combined")).toBeInTheDocument();
});

it("leaves out the heading of an empty group", () => {
  renderCard({ items: [items[0]!] });
  expect(screen.queryByText("Not saved")).not.toBeInTheDocument();
  expect(screen.queryByText("Updated")).not.toBeInTheDocument();
});

it("renders the error alone", () => {
  renderCard({ items: [], error: "Saving the questions failed. Try again, or add them from the Questions page." });
  expect(screen.getByText(/Saving the questions failed/)).toBeInTheDocument();
  expect(screen.queryByRole("group")).not.toBeInTheDocument();
});

it("says how much of a cut-off paste was read and where to resume", () => {
  renderCard({ items: [items[0]!], paste: { readChars: 2000, totalChars: 3400, lastQuestion: "Why this company?" } });
  expect(screen.getByText(
    "Only the first 2,000 of 3,400 pasted characters were read, up to “Why this company?”. Paste the rest, starting with the question after it.",
  )).toBeInTheDocument();
});

it("shows the cut-off notice beside an error", () => {
  renderCard({ items: [], error: "Saving failed.", paste: { readChars: 2000, totalChars: 3400, lastQuestion: "Q" } });
  expect(screen.getByText(/Only the first 2,000 of 3,400 pasted characters/)).toBeInTheDocument();
});
