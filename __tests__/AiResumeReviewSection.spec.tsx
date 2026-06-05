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

const mockSubmit = vi.fn();
const mockStop = vi.fn();
let mockUseObjectReturn = {
  object: null as any,
  submit: mockSubmit,
  isLoading: false,
  stop: mockStop,
};

vi.mock("@ai-sdk/react", () => ({
  experimental_useObject: () => mockUseObjectReturn,
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
  Sheet: ({ children, open, onOpenChange }: any) => (
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
  SheetTrigger: ({ children, asChild }: any) => (
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

describe("AiResumeReviewSection – Review button state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseObjectReturn = {
      object: null,
      submit: mockSubmit,
      isLoading: false,
      stop: mockStop,
    };
  });

  it("is enabled when resume has fewer than 2 sections", () => {
    render(<AiResumeReviewSection resume={makeResume(1)} />);
    const trigger = within(screen.getByTestId("sheet-trigger")).getByRole(
      "button",
    );
    expect(trigger).not.toBeDisabled();
  });

  it("is enabled when resume has no sections", () => {
    render(<AiResumeReviewSection resume={makeResume(0)} />);
    const trigger = within(screen.getByTestId("sheet-trigger")).getByRole(
      "button",
    );
    expect(trigger).not.toBeDisabled();
  });

  it("is enabled when resume has 2 or more sections", () => {
    render(<AiResumeReviewSection resume={makeResume(2)} />);
    const trigger = within(screen.getByTestId("sheet-trigger")).getByRole(
      "button",
    );
    expect(trigger).not.toBeDisabled();
  });

  it("is enabled when resume has 3 sections", () => {
    render(<AiResumeReviewSection resume={makeResume(3)} />);
    const trigger = within(screen.getByTestId("sheet-trigger")).getByRole(
      "button",
    );
    expect(trigger).not.toBeDisabled();
  });

  it("is disabled while AI is loading", () => {
    mockUseObjectReturn = { ...mockUseObjectReturn, isLoading: true };
    render(<AiResumeReviewSection resume={makeResume(3)} />);
    const trigger = within(screen.getByTestId("sheet-trigger")).getByRole(
      "button",
    );
    expect(trigger).toBeDisabled();
  });
});

describe("AiResumeReviewSection – Generate AI Review button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseObjectReturn = {
      object: null,
      submit: mockSubmit,
      isLoading: false,
      stop: mockStop,
    };
  });

  it("shows toast error when resume has fewer than 2 sections and generate is called", () => {
    render(<AiResumeReviewSection resume={makeResume(1)} />);

    const generateButtons = screen.queryAllByRole("button", {
      name: /generate ai review/i,
    });
    if (generateButtons.length > 0) {
      fireEvent.click(generateButtons[0]);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          title: "Not enough content",
        }),
      );
    }
  });

  it("calls submit with resume and model when generate is clicked with valid resume", async () => {
    const resume = makeResume(3);
    render(<AiResumeReviewSection resume={resume} />);

    const generateButtons = screen.queryAllByRole("button", {
      name: /generate ai review/i,
    });
    if (generateButtons.length > 0) {
      fireEvent.click(generateButtons[0]);
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ resume }),
      );
    }
  });
});

describe("AiResumeReviewSection – loading state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading indicator while AI is streaming", () => {
    mockUseObjectReturn = {
      object: null,
      submit: mockSubmit,
      isLoading: true,
      stop: mockStop,
    };
    render(<AiResumeReviewSection resume={makeResume(3)} />);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("shows review content after streaming completes", () => {
    mockUseObjectReturn = {
      object: { summary: "Great resume", scores: { overall: 85 } },
      submit: mockSubmit,
      isLoading: false,
      stop: mockStop,
    };
    render(<AiResumeReviewSection resume={makeResume(3)} />);
    expect(screen.getByTestId("review-content")).toBeInTheDocument();
    expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
  });
});
