import { render, screen } from "@testing-library/react";
import { AgentResultCard } from "@/components/agent/AgentResultCard";
import { AgentToolRunningCard } from "@/components/agent/AgentToolRunningCard";
import { AGENT_TOOL_VIEWS } from "@/components/agent/AgentToolViews";
import { AGENT_TOOL_META, AGENT_TOOL_NAMES } from "@/lib/agent/registry";

vi.mock("@/components/agent/AgentChatProvider", () => ({ useAgentChat: vi.fn() }));

it.each(AGENT_TOOL_NAMES)("provides the required views for %s", (name) => {
  const view = AGENT_TOOL_VIEWS[name];
  expect(view.Result).toBeDefined();
  if (AGENT_TOOL_META[name].kind === "write") expect(view.Approval).toBeDefined();
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
