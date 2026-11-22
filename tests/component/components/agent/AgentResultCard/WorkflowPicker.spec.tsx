import { fireEvent, render, screen } from "@testing-library/react";
import { AgentResultCard } from "@/components/agent/AgentResultCard";

const sendMessage = vi.fn();
vi.mock("@/components/agent/AgentChatProvider", () => ({
  useAgentChat: () => ({ sendMessage }),
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ onValueChange }: { onValueChange: (id: string) => void }) => (
    <button onClick={() => onValueChange("r1")}>Pick Engineering</button>
  ),
  SelectContent: vi.fn(), SelectItem: vi.fn(), SelectTrigger: vi.fn(), SelectValue: vi.fn(),
}));

it.each([
  ["review_resume", 'Review my resume "Engineering"'],
  ["match_job", 'Match this job against my resume "Engineering"'],
  ["generate_cover_letter", 'Write a cover letter for this job using my resume "Engineering"'],
  ["get_resume", 'Use my resume "Engineering"'],
])("sends the selection from %s", (toolName, text) => {
  render(<AgentResultCard part={{
    type: `tool-${toolName}`, toolCallId: "c1", state: "output-available", input: {},
    output: { status: "needs_selection", resumes: [{ id: "r1", title: "Engineering" }] },
  }} />);
  fireEvent.click(screen.getByRole("button", { name: "Pick Engineering" }));
  expect(sendMessage).toHaveBeenCalledWith({ parts: [
    { type: "text", text },
    ...(toolName === "get_resume" ? [] : [{
      type: "data-direct-invoke", data: { toolName, input: { resumeTitle: "Engineering" } },
    }]),
  ] });
});
