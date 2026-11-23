import { render, screen } from "@testing-library/react";
import { AddQuestionResult } from "@/components/agent/AgentResultCard/AddQuestionResult";
import type { AgentAddQuestionResult } from "@/models/agent.model";
import type { SaveQuestionResult } from "@/models/question.model";

const tag = (label: string) => ({ id: `t-${label}`, label, created: false });

const items: SaveQuestionResult[] = [
  { index: 1, question: "Tell me about yourself", status: "saved", tags: [tag("Communication")], droppedTags: [] },
  { index: 2, question: "Why Postgres over Mongo?", status: "merged", mode: "append", savedQuestion: "Why Postgres over Mongo?", hadAnswer: true, tags: [], droppedTags: [] },
  { index: 3, question: "What is a closure?", status: "merged", mode: "replace", savedQuestion: "What is a closure?", hadAnswer: true, tags: [], droppedTags: [] },
  { index: 4, question: "Why this company?", status: "skipped", existing: { question: "Why this company?" } },
  { index: 5, question: "Describe a deploy", status: "exists", existing: { id: "q1", question: "Describe a deploy", hasAnswer: true, canReplace: true } },
  { index: 6, question: "How do you deal with a broken deployment?", status: "similar", candidates: [], hasIncomingAnswer: false },
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

it("names the stored spelling of an updated question", () => {
  renderCard({ items: [{
    index: 1, question: "how do you handle a failing deploy", status: "merged", mode: "append",
    savedQuestion: "How do you deal with a broken deployment?", hadAnswer: true, tags: [], droppedTags: [],
  }] });
  const group = screen.getByRole("group", { name: "Updated" });
  expect(group).toHaveTextContent("How do you deal with a broken deployment?");
  expect(group).not.toHaveTextContent("how do you handle a failing deploy");
});

// Transcripts saved before savedQuestion existed still render
it("falls back to the question on a historical merged result", () => {
  const historical = { index: 1, question: "Why Postgres over Mongo?", status: "merged", mode: "append", tags: [], droppedTags: [] };
  renderCard({ items: [historical as unknown as SaveQuestionResult] });
  expect(screen.getByRole("group", { name: "Updated" })).toHaveTextContent("Why Postgres over Mongo?");
});

it("shows a refused Replace's reason with no instructions to the assistant", () => {
  renderCard({ items: [{
    index: 1, question: "Describe a deploy", status: "invalid", appendOnly: true, userFacing: true,
    error: "Only an answer added below the saved one is allowed for this app-created question.",
  }] });
  const group = screen.getByRole("group", { name: "Waiting on your reply" });
  expect(group).toHaveTextContent("Only an answer added below the saved one is allowed for this app-created question.");
  expect(group).not.toHaveTextContent(/mergeInto|add_question|call/i);
});

it("shows a validation error on an invalid item", () => {
  renderCard({ items: [{ index: 1, question: "Short answer", status: "invalid", error: "answer must be at least 10 characters", userFacing: true }] });
  expect(screen.getByRole("group", { name: "Waiting on your reply" })).toHaveTextContent("answer must be at least 10 characters");
});

// Protocol errors and older transcripts address the model, not the user
it.each([
  "That question id does not match this question. Send it again without mergeInto to see its matches.",
  "The saved question has no answer, so there is nothing to replace; use append.",
])("hides error text not written for the user: %s", (error) => {
  renderCard({ items: [{ index: 1, question: "Describe a deploy", status: "invalid", error }] });
  const group = screen.getByRole("group", { name: "Waiting on your reply" });
  expect(group).toHaveTextContent("Describe a deploy");
  expect(group).not.toHaveTextContent(error);
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
