import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const sendMessage = vi.fn();
const seedExchange = vi.fn();
let preflight = { checked: true, ok: true };

vi.mock("@/components/agent/AgentChatProvider", () => ({
  useAgentChat: () => ({ sendMessage, seedExchange, preflight }),
}));

import { AgentChatEmptyState } from "@/components/agent/AgentChatEmptyState";
import { AGENT_ADD_JOB_INTRO } from "@/lib/agent/prompt";
import { directInvokeParts } from "@/models/agent.model";

describe("AgentChatEmptyState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preflight = { checked: true, ok: true };
  });

  // The click carries no company, title or posting, so add_job is
  // unreachable and the prompt leaves the model one legal reply. Spending a
  // 15-30s turn on it is latency for text we already know.
  it("answers the add-job suggestion locally instead of calling the model", async () => {
    render(<AgentChatEmptyState />);
    await userEvent.click(screen.getByText("Add a job posting"));

    expect(sendMessage).not.toHaveBeenCalled();
    expect(seedExchange).toHaveBeenCalledWith(
      "Add a job posting",
      AGENT_ADD_JOB_INTRO,
    );
  });

  // The click already names the tool, so a thinking turn only adds latency.
  it.each([
    ["Review resume", "review_resume"],
    ["Match a job", "match_job"],
    ["Generate cover letter", "generate_cover_letter"],
  ] as const)("runs %s as a direct invoke", async (label, toolName) => {
    render(<AgentChatEmptyState />);
    await userEvent.click(screen.getByText(label));

    expect(seedExchange).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith({
      parts: directInvokeParts(label, toolName),
    });
  });

  it("does nothing when preflight failed", async () => {
    preflight = { checked: true, ok: false };
    render(<AgentChatEmptyState />);
    await userEvent.click(screen.getByText("Add a job posting"));

    expect(seedExchange).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
