import { render } from "@testing-library/react";
import { GetResumeResult } from "@/components/agent/AgentResultCard/GetResumeResult";

const pickerProps = vi.fn();
vi.mock("@/components/agent/AgentResumePicker", () => ({
  AgentResumePicker: (props: { messageFor?: (title: string) => string }) => {
    pickerProps(props);
    return null;
  },
}));

it("names the picked resume without asking for a review", () => {
  render(
    <GetResumeResult
      output={{ status: "needs_selection", resumes: [{ id: "r1", title: "Backend 2026" }] }}
    />,
  );
  const { messageFor } = pickerProps.mock.calls[0]![0];
  expect(messageFor?.("Backend 2026")).toBe('Use my resume "Backend 2026"');
  expect(messageFor?.("Backend 2026")).not.toMatch(/review/i);
});
