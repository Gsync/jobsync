import React from "react";
import { render, waitFor } from "@testing-library/react";
import { AiJobMatchSection } from "@/components/profile/AiJobMatchSection";

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

// Mock Radix UI portals to render inline
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: any) => (open ? <div>{children}</div> : null),
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

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectGroup: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => null,
}));

const completedMatchObject = {
  matchScore: 82,
  recommendation: "good match" as const,
  summary: "Strong frontend candidate",
  requirements: { met: [], missing: [], partial: [] },
  skills: { matched: [], missing: [], transferable: [], bonus: [] },
  experience: {
    levelMatch: "match",
    yearsRequired: 3,
    yearsApparent: 5,
    relevance: "highly relevant",
  },
  keywords: { matched: [], missing: [], addToResume: [] },
  dealBreakers: [],
  tailoringTips: [],
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
    mockUseObjectReturn = {
      object: null,
      submit: mockSubmit,
      isLoading: false,
      stop: mockStop,
    };
  });

  it("saves match result when streaming completes with valid data", async () => {
    mockSaveJobMatchResult.mockResolvedValue({ success: true });

    // Start with loading state
    mockUseObjectReturn = {
      object: null,
      submit: mockSubmit,
      isLoading: true,
      stop: mockStop,
    };

    const { rerender } = render(<AiJobMatchSection {...defaultProps} />);

    // Transition to completed with result
    mockUseObjectReturn = {
      object: completedMatchObject,
      submit: mockSubmit,
      isLoading: false,
      stop: mockStop,
    };

    rerender(<AiJobMatchSection {...defaultProps} />);

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
    mockSaveJobMatchResult.mockResolvedValue({ success: true });

    mockUseObjectReturn = {
      object: null,
      submit: mockSubmit,
      isLoading: true,
      stop: mockStop,
    };

    const { rerender } = render(<AiJobMatchSection {...defaultProps} />);

    mockUseObjectReturn = {
      object: completedMatchObject,
      submit: mockSubmit,
      isLoading: false,
      stop: mockStop,
    };

    rerender(<AiJobMatchSection {...defaultProps} />);

    await waitFor(() => {
      expect(defaultProps.onMatchSaved).toHaveBeenCalledWith(
        82,
        expect.stringContaining('"matchScore":82'),
      );
    });
  });

  it("shows success toast after save", async () => {
    mockSaveJobMatchResult.mockResolvedValue({ success: true });

    mockUseObjectReturn = {
      object: null,
      submit: mockSubmit,
      isLoading: true,
      stop: mockStop,
    };

    const { rerender } = render(<AiJobMatchSection {...defaultProps} />);

    mockUseObjectReturn = {
      object: completedMatchObject,
      submit: mockSubmit,
      isLoading: false,
      stop: mockStop,
    };

    rerender(<AiJobMatchSection {...defaultProps} />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: "Match result saved" });
    });
  });

  it("does not save when stream has no matchScore", async () => {
    mockUseObjectReturn = {
      object: null,
      submit: mockSubmit,
      isLoading: true,
      stop: mockStop,
    };

    const { rerender } = render(<AiJobMatchSection {...defaultProps} />);

    mockUseObjectReturn = {
      object: { summary: "partial data" },
      submit: mockSubmit,
      isLoading: false,
      stop: mockStop,
    };

    rerender(<AiJobMatchSection {...defaultProps} />);

    // Give effect time to run
    await new Promise((r) => setTimeout(r, 50));

    expect(mockSaveJobMatchResult).not.toHaveBeenCalled();
    expect(defaultProps.onMatchSaved).not.toHaveBeenCalled();
  });

  it("does not save when component mounts without prior loading", async () => {
    mockUseObjectReturn = {
      object: completedMatchObject,
      submit: mockSubmit,
      isLoading: false,
      stop: mockStop,
    };

    render(<AiJobMatchSection {...defaultProps} />);

    await new Promise((r) => setTimeout(r, 50));

    expect(mockSaveJobMatchResult).not.toHaveBeenCalled();
  });

  it("shows error toast when save fails", async () => {
    mockSaveJobMatchResult.mockResolvedValue({
      success: false,
      message: "DB error",
    });

    mockUseObjectReturn = {
      object: null,
      submit: mockSubmit,
      isLoading: true,
      stop: mockStop,
    };

    const { rerender } = render(<AiJobMatchSection {...defaultProps} />);

    mockUseObjectReturn = {
      object: completedMatchObject,
      submit: mockSubmit,
      isLoading: false,
      stop: mockStop,
    };

    rerender(<AiJobMatchSection {...defaultProps} />);

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
    mockSaveJobMatchResult.mockResolvedValue({ success: true });

    mockUseObjectReturn = {
      object: null,
      submit: mockSubmit,
      isLoading: true,
      stop: mockStop,
    };

    const { rerender } = render(<AiJobMatchSection {...defaultProps} />);

    mockUseObjectReturn = {
      object: completedMatchObject,
      submit: mockSubmit,
      isLoading: false,
      stop: mockStop,
    };

    rerender(<AiJobMatchSection {...defaultProps} />);

    await waitFor(() => {
      const savedData = mockSaveJobMatchResult.mock.calls[0][2];
      const parsed = JSON.parse(savedData);
      expect(parsed).toHaveProperty("matchedAt");
      expect(parsed.matchScore).toBe(82);
      expect(parsed.summary).toBe("Strong frontend candidate");
    });
  });
});
