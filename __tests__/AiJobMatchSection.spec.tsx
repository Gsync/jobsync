import React from "react";
import { render, waitFor, act } from "@testing-library/react";
import { AiJobMatchSection } from "@/components/profile/AiJobMatchSection";
import type { JobMatchResult } from "@/utils/streamJobMatch.utils";

const mockStreamJobMatch = vi.fn();
vi.mock("@/utils/streamJobMatch.utils", () => ({
  streamJobMatch: (...args: any[]) => mockStreamJobMatch(...args),
}));

const mockSaveJobMatchResult = vi.fn();
vi.mock("@/actions/job.actions", () => ({
  saveJobMatchResult: (...args: any[]) => mockSaveJobMatchResult(...args),
}));

vi.mock("@/actions/profile.actions", () => ({
  getResumeList: vi.fn().mockResolvedValue({
    success: true,
    data: [{ id: "resume-1", title: "My Resume" }],
  }),
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

vi.mock("@/components/profile/AiJobMatchResponseContent", () => ({
  AiJobMatchResponseContent: () => <div data-testid="match-content" />,
}));

vi.mock("@/components/Loading", () => ({
  __esModule: true,
  default: () => <div data-testid="loading" />,
}));

// Capture the Sheet's onOpenChange so a test can simulate closing the sheet.
const mockSheetProps: { onOpenChange?: (open: boolean) => void } = {};

// Tracks whether the auto-select has fired, so it fires exactly once per test
// (a real user selects a resume once, not on every re-render).
const mockSelectFired = { done: false };

// Mock Radix UI portals to render inline
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open, onOpenChange }: any) => {
    mockSheetProps.onOpenChange = onOpenChange;
    return open ? <div>{children}</div> : null;
  },
  SheetPortal: ({ children }: any) => <div>{children}</div>,
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
}));

// Auto-select the resume so the match request fires on mount.
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange }: any) => {
    React.useEffect(() => {
      // Fire on a macrotask so the async resume-list fetch resolves first
      // (mirrors a real user selecting after the list has loaded). Reschedule
      // across re-renders but fire only once total.
      if (mockSelectFired.done) return;
      const t = setTimeout(() => {
        mockSelectFired.done = true;
        onValueChange?.("resume-1");
      }, 0);
      return () => clearTimeout(t);
    }, [onValueChange]);
    return <div>{children}</div>;
  },
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectGroup: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => null,
}));

const completedMatch: JobMatchResult = {
  scores: { matchScore: 82, recommendation: "good match" },
  body: "## Summary\nStrong frontend candidate",
};

describe("AiJobMatchSection – auto-save", () => {
  const defaultProps = {
    aISectionOpen: true,
    triggerChange: vi.fn(),
    jobId: "job-1",
    onMatchSaved: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectFired.done = false;
  });

  it("saves match result when streaming completes with valid data", async () => {
    mockStreamJobMatch.mockResolvedValue(completedMatch);
    mockSaveJobMatchResult.mockResolvedValue({ success: true });

    render(<AiJobMatchSection {...defaultProps} />);

    await waitFor(() => {
      expect(mockSaveJobMatchResult).toHaveBeenCalledTimes(1);
      expect(mockSaveJobMatchResult).toHaveBeenCalledWith(
        "job-1",
        82,
        expect.stringContaining('"matchScore":82'),
      );
    });
  });

  it("calls onMatchSaved callback after successful save", async () => {
    mockStreamJobMatch.mockResolvedValue(completedMatch);
    mockSaveJobMatchResult.mockResolvedValue({ success: true });

    render(<AiJobMatchSection {...defaultProps} />);

    await waitFor(() => {
      expect(defaultProps.onMatchSaved).toHaveBeenCalledWith(
        82,
        expect.stringContaining('"matchScore":82'),
      );
    });
  });

  it("shows success toast after save", async () => {
    mockStreamJobMatch.mockResolvedValue(completedMatch);
    mockSaveJobMatchResult.mockResolvedValue({ success: true });

    render(<AiJobMatchSection {...defaultProps} />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: "Match result saved" });
    });
  });

  it("does not save when the user closes the sheet mid-stream", async () => {
    // streamJobMatch salvages partial data and resolves on abort, so the
    // component must skip saving a match the user cancelled.
    let resolveStream!: (value: JobMatchResult) => void;
    const streamCall = new Promise<JobMatchResult>((r) => {
      resolveStream = r;
    });
    mockStreamJobMatch.mockReturnValue(streamCall);
    mockSaveJobMatchResult.mockResolvedValue({ success: true });

    render(<AiJobMatchSection {...defaultProps} />);

    // Wait until the match request is in flight.
    await waitFor(() => expect(mockStreamJobMatch).toHaveBeenCalledTimes(1));

    // User closes the sheet -> component aborts the in-flight controller.
    await act(async () => {
      mockSheetProps.onOpenChange?.(false);
    });

    // The stream then resolves with the salvaged partial result.
    await act(async () => {
      resolveStream({
        scores: { matchScore: 82, recommendation: "good match" },
        body: "partial",
      });
      await streamCall;
    });

    expect(mockSaveJobMatchResult).not.toHaveBeenCalled();
    expect(defaultProps.onMatchSaved).not.toHaveBeenCalled();
  });

  it("does not save when stream returns no scores", async () => {
    mockStreamJobMatch.mockResolvedValue({ body: "partial data" });

    render(<AiJobMatchSection {...defaultProps} />);

    await new Promise((r) => setTimeout(r, 50));

    expect(mockSaveJobMatchResult).not.toHaveBeenCalled();
    expect(defaultProps.onMatchSaved).not.toHaveBeenCalled();
  });

  it("shows error toast when save fails", async () => {
    mockStreamJobMatch.mockResolvedValue(completedMatch);
    mockSaveJobMatchResult.mockResolvedValue({
      success: false,
      message: "DB error",
    });

    render(<AiJobMatchSection {...defaultProps} />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "Error!",
        description: "DB error",
      });
    });

    expect(defaultProps.onMatchSaved).not.toHaveBeenCalled();
  });

  it("includes resume metadata in saved matchData", async () => {
    mockStreamJobMatch.mockResolvedValue(completedMatch);
    mockSaveJobMatchResult.mockResolvedValue({ success: true });

    render(<AiJobMatchSection {...defaultProps} />);

    await waitFor(() => {
      const savedData = mockSaveJobMatchResult.mock.calls[0][2];
      const parsed = JSON.parse(savedData);
      expect(parsed).toHaveProperty("matchedAt");
      expect(parsed.matchScore).toBe(82);
      expect(parsed.resumeTitle).toBe("My Resume");
      expect(parsed.body).toContain("Strong frontend candidate");
    });
  });
});
