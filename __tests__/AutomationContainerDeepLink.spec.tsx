import { act, render, screen } from "@testing-library/react";
import { AutomationContainer } from "@/components/automations/AutomationContainer";

const replace = vi.fn();
const router = { replace };
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
}));
vi.mock("@/actions/automation.actions", () => ({
  getAutomationsList: vi.fn(async () => ({ success: true, data: [] })),
}));
vi.mock("@/components/automations/AutomationList", () => ({
  AutomationList: () => null,
}));
vi.mock("@/components/automations/AutomationWizard", () => ({
  AutomationWizard: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="wizard">
      {open ? "open" : "closed"}
      <button onClick={() => onOpenChange(false)}>close wizard</button>
    </div>
  ),
}));

describe("AutomationContainer ?add-automation=true", () => {
  it("opens the wizard once and strips the param", async () => {
    searchParams = new URLSearchParams("add-automation=true&x=1");
    const { rerender } = render(<AutomationContainer resumes={[]} />);
    expect(await screen.findByTestId("wizard")).toHaveTextContent("open");
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("?x=1");

    act(() => screen.getByText("close wizard").click());
    expect(screen.getByTestId("wizard")).toHaveTextContent("closed");
    rerender(<AutomationContainer resumes={[]} />);
    expect(screen.getByTestId("wizard")).toHaveTextContent("closed");
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("stays closed without the param", async () => {
    searchParams = new URLSearchParams();
    render(<AutomationContainer resumes={[]} />);
    expect(await screen.findByTestId("wizard")).toHaveTextContent("closed");
    expect(replace).not.toHaveBeenCalled();
  });
});
