import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from "@testing-library/react";
import AiResumeReviewSection from "@/components/profile/AiResumeReviewSection";
import { Resume, SectionType } from "@/models/profile.model";
import type { ResumeReviewResult } from "@/utils/streamResumeReview.utils";

const mockStreamResumeReview = vi.fn();
vi.mock("@/utils/streamResumeReview.utils", () => ({
  streamResumeReview: (...args: any[]) => mockStreamResumeReview(...args),
}));

const mockSaveResumeReviewResult = vi.fn();
vi.mock("@/actions/profile.actions", () => ({
  saveResumeReviewResult: (...args: any[]) =>
    mockSaveResumeReviewResult(...args),
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

// Capture the Sheet's onOpenChange so a test can simulate closing the sheet.
const mockSheetProps: { onOpenChange?: (open: boolean) => void } = {};

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open, onOpenChange }: any) => {
    mockSheetProps.onOpenChange = onOpenChange;
    return (
      <div data-testid="sheet" data-open={open}>
        {children}
      </div>
    );
  },
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

// Opens the sheet (via the "Review" trigger) so the aISectionOpen-gated
// settings fetch runs and selectedModel picks up the mocked AI settings.
// Waits on the rendered provider/model label (not just the fetch call) so
// the state update has actually flushed before the caller proceeds.
const openSheet = async () => {
  const trigger = within(screen.getByTestId("sheet-trigger")).getByRole(
    "button",
  );
  fireEvent.click(trigger);
  await waitFor(() => expect(screen.getByText(/gpt-4o/i)).toBeInTheDocument());
};

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

const completedReview: ResumeReviewResult = {
  scores: { overall: 85, impact: 80, clarity: 82, atsCompatibility: 78 },
  body: "## Summary\nGreat resume",
};

describe("AiResumeReviewSection – auto-save", () => {
  const onReviewSaved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onReviewSaved.mockClear();
  });

  it("saves review result when streaming completes with valid data", async () => {
    mockStreamResumeReview.mockResolvedValue(completedReview);
    mockSaveResumeReviewResult.mockResolvedValue({ success: true });

    const resume = makeResume(3);
    render(
      <AiResumeReviewSection resume={resume} onReviewSaved={onReviewSaved} />,
    );
    await openSheet();
    fireEvent.click(getGenerateButton());

    await waitFor(() => {
      expect(mockSaveResumeReviewResult).toHaveBeenCalledTimes(1);
      expect(mockSaveResumeReviewResult).toHaveBeenCalledWith(
        resume.id,
        expect.stringContaining('"overall":85'),
      );
    });

    const savedData = JSON.parse(mockSaveResumeReviewResult.mock.calls[0][1]);
    expect(savedData).toMatchObject({
      overall: 85,
      impact: 80,
      clarity: 82,
      atsCompatibility: 78,
      body: "## Summary\nGreat resume",
      provider: "openai",
      model: "gpt-4o",
    });
    expect(savedData.reviewedAt).toBeTruthy();
  });

  it("calls onReviewSaved callback after successful save", async () => {
    mockStreamResumeReview.mockResolvedValue(completedReview);
    mockSaveResumeReviewResult.mockResolvedValue({ success: true });

    render(
      <AiResumeReviewSection
        resume={makeResume(3)}
        onReviewSaved={onReviewSaved}
      />,
    );
    fireEvent.click(getGenerateButton());

    await waitFor(() => {
      expect(onReviewSaved).toHaveBeenCalledWith(
        expect.stringContaining('"overall":85'),
      );
    });
  });

  it("shows success toast after save", async () => {
    mockStreamResumeReview.mockResolvedValue(completedReview);
    mockSaveResumeReviewResult.mockResolvedValue({ success: true });

    render(<AiResumeReviewSection resume={makeResume(3)} />);
    fireEvent.click(getGenerateButton());

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: "Review saved" });
    });
  });

  it("does not save when the user closes the sheet mid-stream", async () => {
    // streamResumeReview salvages partial data and resolves on abort, so the
    // component must skip saving a review the user cancelled.
    let resolveStream!: (value: ResumeReviewResult) => void;
    const streamCall = new Promise<ResumeReviewResult>((r) => {
      resolveStream = r;
    });
    mockStreamResumeReview.mockReturnValue(streamCall);
    mockSaveResumeReviewResult.mockResolvedValue({ success: true });

    render(
      <AiResumeReviewSection
        resume={makeResume(3)}
        onReviewSaved={onReviewSaved}
      />,
    );
    fireEvent.click(getGenerateButton());

    await waitFor(() =>
      expect(mockStreamResumeReview).toHaveBeenCalledTimes(1),
    );

    // User closes the sheet -> component aborts the in-flight controller.
    await act(async () => {
      mockSheetProps.onOpenChange?.(false);
    });

    // The stream then resolves with the salvaged partial result.
    await act(async () => {
      resolveStream({
        scores: { overall: 85, impact: 80, clarity: 82, atsCompatibility: 78 },
        body: "partial",
      });
      await streamCall;
    });

    expect(mockSaveResumeReviewResult).not.toHaveBeenCalled();
    expect(onReviewSaved).not.toHaveBeenCalled();
  });

  it("does not save when stream returns no scores", async () => {
    mockStreamResumeReview.mockResolvedValue({ body: "partial data" });

    render(
      <AiResumeReviewSection
        resume={makeResume(3)}
        onReviewSaved={onReviewSaved}
      />,
    );
    fireEvent.click(getGenerateButton());

    await new Promise((r) => setTimeout(r, 50));

    expect(mockSaveResumeReviewResult).not.toHaveBeenCalled();
    expect(onReviewSaved).not.toHaveBeenCalled();
  });

  it("shows error toast when save fails", async () => {
    mockStreamResumeReview.mockResolvedValue(completedReview);
    mockSaveResumeReviewResult.mockResolvedValue({
      success: false,
      message: "DB error",
    });

    render(
      <AiResumeReviewSection
        resume={makeResume(3)}
        onReviewSaved={onReviewSaved}
      />,
    );
    fireEvent.click(getGenerateButton());

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "Error!",
        description: "DB error",
      });
    });

    expect(onReviewSaved).not.toHaveBeenCalled();
  });
});
