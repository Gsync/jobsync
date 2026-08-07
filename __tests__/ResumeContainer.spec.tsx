import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Resume } from "@/models/profile.model";

const chat = {
  open: vi.fn(),
  sendMessage: vi.fn(),
  clear: vi.fn(async () => {}),
  approvalPending: false,
};
vi.mock("@/components/agent/AgentChatProvider", () => ({
  useAgentChat: () => chat,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/actions/profile.actions", () => ({
  deleteResumeById: vi.fn(),
  deleteSkillsSection: vi.fn(),
  setDefaultResume: vi.fn(),
}));
vi.mock("@/actions/resumeImport.actions", () => ({
  resolveImportCard: vi.fn(),
}));
vi.mock("@/actions/userSettings.actions", () => ({
  getUserSettings: vi.fn(async () => ({ success: false })),
}));
vi.mock("@/utils/ai.utils", () => ({
  checkOllamaConnection: vi.fn(async () => ({ isConnected: false })),
}));

// Unrelated to the Review button — stub out so its own heavy dialogs and
// dependencies don't have to be satisfied for this test.
vi.mock("@/components/profile/AddResumeSection", () => ({
  default: () => null,
}));

import ResumeContainer from "@/components/profile/ResumeContainer";

const resume: Resume = { id: "r1", title: "Senior Engineer Resume" };

const clickReview = () =>
  userEvent.click(screen.getByRole("button", { name: /^review$/i }));

describe("ResumeContainer — Review button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chat.approvalPending = false;
    chat.clear.mockImplementation(async () => {});
  });

  it("opens the panel before clearing, then sends the review request", async () => {
    render(<ResumeContainer resume={resume} defaultResumeId={null} />);
    await clickReview();

    expect(chat.clear).toHaveBeenCalled();
    expect(chat.sendMessage).toHaveBeenCalledWith({
      parts: [{ type: "text", text: "Review Senior Engineer Resume" }],
    });

    // Opening first is what stops a failed clear from leaving a dead button.
    const openOrder = chat.open.mock.invocationCallOrder[0];
    const clearOrder = chat.clear.mock.invocationCallOrder[0];
    const sendOrder = chat.sendMessage.mock.invocationCallOrder[0];
    expect(openOrder).toBeLessThan(clearOrder);
    expect(clearOrder).toBeLessThan(sendOrder);
  });

  it("still opens and sends when the clear fails", async () => {
    chat.clear.mockRejectedValue(new Error("offline"));
    render(<ResumeContainer resume={resume} defaultResumeId={null} />);
    await clickReview();

    expect(chat.open).toHaveBeenCalled();
    expect(chat.sendMessage).toHaveBeenCalled();
  });

  it("asks before wiping a conversation with a pending approval", async () => {
    chat.approvalPending = true;
    render(<ResumeContainer resume={resume} defaultResumeId={null} />);
    await clickReview();

    expect(
      screen.getByText(/waiting for your approval/i),
    ).toBeInTheDocument();
    expect(chat.clear).not.toHaveBeenCalled();
    expect(chat.sendMessage).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: /clear and review/i }),
    );
    expect(chat.clear).toHaveBeenCalled();
    expect(chat.sendMessage).toHaveBeenCalledWith({
      parts: [{ type: "text", text: "Review Senior Engineer Resume" }],
    });
  });

  it("leaves the pending approval alone when the confirm is cancelled", async () => {
    chat.approvalPending = true;
    render(<ResumeContainer resume={resume} defaultResumeId={null} />);
    await clickReview();
    await userEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(chat.clear).not.toHaveBeenCalled();
    expect(chat.sendMessage).not.toHaveBeenCalled();
    expect(chat.open).not.toHaveBeenCalled();
  });
});
