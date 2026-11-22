import { render, screen } from "@testing-library/react";
import { AgentResultCard } from "@/components/agent/AgentResultCard";
import { AgentToolRunningCard } from "@/components/agent/AgentToolRunningCard";
import { AGENT_TOOL_VIEWS, workflowOutcome } from "@/components/agent/AgentToolViews";
import { AGENT_TOOL_META, AGENT_TOOL_NAMES } from "@/lib/agent/registry";
import { buildAgentToolApproval } from "@/lib/agent/tools";

vi.mock("@/components/agent/AgentChatProvider", () => ({ useAgentChat: vi.fn() }));

const approvalGated = Object.keys(buildAgentToolApproval());

it.each(AGENT_TOOL_NAMES)("provides the required views for %s", (name) => {
  const view = AGENT_TOOL_VIEWS[name];
  expect(view.Result).toBeDefined();
  expect(Boolean(view.Approval)).toBe(approvalGated.includes(name));
  if (AGENT_TOOL_META[name].kind === "workflow") expect(view.Stream).toBeDefined();
});

const retiredPart = { type: "tool-retired_tool", toolCallId: "c1", input: {} } as const;

it("shows the running fallback for a retired tool", () => {
  render(<AgentToolRunningCard part={{ ...retiredPart, state: "input-available" }} />);
  expect(screen.getByText("Working…")).toBeInTheDocument();
});

it("renders an empty result card for a retired tool", () => {
  const { container } = render(
    <AgentResultCard part={{ ...retiredPart, state: "output-available", output: { status: "ok" } }} />,
  );
  expect(container.firstElementChild).toBeEmptyDOMElement();
});

it("gives every tool with steps an outcome", () => {
  for (const name of AGENT_TOOL_NAMES) {
    if (AGENT_TOOL_META[name].steps.length === 0) continue;
    expect(AGENT_TOOL_VIEWS[name].outcome, name).toBeDefined();
  }
});

it("maps workflow outputs to outcomes", () => {
  const gen = { status: "generation_failed", reason: "x" };
  expect(workflowOutcome({ status: "ok", saved: true })).toBe("ok");
  expect(workflowOutcome({ status: "ok", saved: false })).toBe("failed");
  expect(workflowOutcome({ ...gen, busy: true })).toBe("answer");
  expect(workflowOutcome({ ...gen, timedOut: true })).toBe("timedOut");
  expect(workflowOutcome(gen)).toBe("failed");
  expect(workflowOutcome({ status: "unreadable" })).toBe("failed");
  expect(workflowOutcome({ status: "needs_selection" })).toBe("answer");
});

it("maps an add_job duplicate to answer", () => {
  const outcome = AGENT_TOOL_VIEWS.add_job.outcome!;
  expect(outcome({ created: true })).toBe("ok");
  expect(outcome({ created: false, duplicateOf: { id: "j1" } })).toBe("answer");
  expect(outcome({ created: false, validationError: "bad" })).toBe("failed");
});

it("maps add_question outputs to outcomes", () => {
  const outcome = AGENT_TOOL_VIEWS.add_question.outcome!;
  const item = (status: string) => ({ index: 1, question: "Q?", status });
  expect(outcome({ items: [], error: "Saving the questions failed." })).toBe("failed");
  expect(outcome({ items: [item("saved"), item("similar")] })).toBe("answer");
  expect(outcome({ items: [item("saved"), item("failed")] })).toBe("failed");
  expect(outcome({ items: [item("saved"), item("merged"), item("skipped"), item("repeat")] })).toBe("ok");
});
