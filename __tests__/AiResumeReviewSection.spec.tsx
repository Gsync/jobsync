import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import AiResumeReviewSection from "@/components/profile/AiResumeReviewSection";
import { Resume, SectionType } from "@/models/profile.model";

const mockStreamResumeReview = vi.fn();
vi.mock("@/utils/streamResumeReview.utils", () => ({
  streamResumeReview: (...args: any[]) => mockStreamResumeReview(...args),
}));

vi.mock("@/actions/userSettings.actions", () => ({
  getUserSettings: vi.fn().mockResolvedValue({
    success: true,
    data: { settings: { ai: { provider: "openai", model: "gpt-4o" } } },
  }),
}));

vi.mock("@/utils/ai.utils", () => ({
  checkOllamaConnection: vi.fn().mockResolvedValue({ isConnected: true }),
}));

const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: any[]) => mockToast(...args),
}));

vi.mock("@/components/profile/AiResumeReviewResponseContent", () => ({
  AiResumeReviewResponseContent: () => <div data-testid="review-content" />,
}));

vi.mock("@/components/Loading", () => ({
  __esModule: true,
  default: () => <div data-testid="loading" />,
}));

vi.mock("@/components/common/SlowResponseWarning", () => ({
  SlowResponseWarning: () => <div data-testid="slow-warning" />,
}));

vi.mock("@/hooks/useSlowResponseWarning", () => ({
  useSlowResponseWarning: () => false,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: any) => (
    <div data-testid="sheet" data-open={open}>
      {children}
    </div>
  ),
  SheetPortal: ({ children }: any) => <div>{children}</div>,
  SheetContent: ({ children }: any) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <div>{children}</div>,
  SheetClose: ({ children }: any) => <div>{children}</div>,
  SheetTrigger: ({ children }: any) => (
    <div data-testid="sheet-trigger">{children}</div>
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
}));

// Fixtures
const makeResume = (sectionCount: number): Resume => ({
  id: "resume-1",
  title: "My Resume",
  ResumeSections: Array.from({ length: sectionCount }, (_, i) => ({
    id: `section-${i}`,
    resumeId: "resume-1",
    sectionTitle: `Section ${i}`,
    sectionType: SectionType.EXPERIENCE,
  })),
});

const getGenerateButton = () =>
  screen.queryAllByRole("button", { name: /generate ai review/i })[0];

describe("AiResumeReviewSection – Review trigger button state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStreamResumeReview.mockResolvedValue({
      scores: { overall: 85, impact: 80, clarity: 82, atsCompatibility: 78 },
      body: "## Summary\nGreat resume",
    });
  });

  it("is enabled regardless of section count", () => {
    render(<AiResumeReviewSection resume={makeResume(1)} />);
    const trigger = within(screen.getByTestId("sheet-trigger")).getByRole(
      "button",
    );
    expect(trigger).not.toBeDisabled();
  });
});

describe("AiResumeReviewSection – Generate AI Review button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStreamResumeReview.mockResolvedValue({
      scores: { overall: 85, impact: 80, clarity: 82, atsCompatibility: 78 },
      body: "## Summary\nGreat resume",
    });
  });

  it("shows toast error when resume has fewer than 2 sections", () => {
    render(<AiResumeReviewSection resume={makeResume(1)} />);
    fireEvent.click(getGenerateButton());
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: "Not enough content",
      }),
    );
    expect(mockStreamResumeReview).not.toHaveBeenCalled();
  });

  it("calls streamResumeReview with the resume id when generate is clicked", () => {
    const resume = makeResume(3);
    render(<AiResumeReviewSection resume={resume} />);
    fireEvent.click(getGenerateButton());
    expect(mockStreamResumeReview).toHaveBeenCalledWith(
      expect.objectContaining({ resumeId: resume.id }),
    );
  });
});

describe("AiResumeReviewSection – loading state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading indicator while the review is streaming", async () => {
    // Pending stream keeps the component in the loading state.
    mockStreamResumeReview.mockReturnValue(new Promise(() => {}));
    render(<AiResumeReviewSection resume={makeResume(3)} />);
    fireEvent.click(getGenerateButton());
    await waitFor(() =>
      expect(screen.getByTestId("loading")).toBeInTheDocument(),
    );
  });

  it("shows review content when not loading", () => {
    mockStreamResumeReview.mockResolvedValue({
      scores: { overall: 85, impact: 80, clarity: 82, atsCompatibility: 78 },
      body: "## Summary\nGreat resume",
    });
    render(<AiResumeReviewSection resume={makeResume(3)} />);
    expect(screen.getByTestId("review-content")).toBeInTheDocument();
    expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
  });
});
