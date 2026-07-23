import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GenerateCoverLetterSection } from "@/components/myjobs/GenerateCoverLetterSection";
import { streamCoverLetter } from "@/utils/streamCoverLetter.utils";
import { generateCoverLetterForJob } from "@/actions/coverLetter.actions";
import { getDefaultResumeId, getResumeList } from "@/actions/profile.actions";

vi.mock("@/utils/streamCoverLetter.utils", () => ({
  streamCoverLetter: vi.fn(),
}));
vi.mock("@/actions/coverLetter.actions", () => ({
  generateCoverLetterForJob: vi.fn(),
}));
vi.mock("@/lib/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("@/actions/userSettings.actions", () => ({
  getUserSettings: vi
    .fn()
    .mockResolvedValue({ success: true, data: { settings: { ai: {} } } }),
}));
vi.mock("@/utils/ai.utils", () => ({
  checkOllamaConnection: vi.fn().mockResolvedValue({ isConnected: true }),
}));
vi.mock("@/actions/profile.actions", () => ({
  getDefaultResumeId: vi.fn(),
  getResumeList: vi.fn(),
}));

// Radix portals don't render into the testing container; render inline.
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  SheetPortal: ({ children }: any) => <div>{children}</div>,
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <div>{children}</div>,
  SheetClose: ({ children }: any) => <div>{children}</div>,
}));

// Radix Select needs pointer APIs jsdom lacks — swap items for buttons.
const SelectCtx = React.createContext<((value: string) => void) | undefined>(
  undefined,
);
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange }: any) => (
    <SelectCtx.Provider value={onValueChange}>
      <div>{children}</div>
    </SelectCtx.Provider>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectGroup: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => {
    const onValueChange = React.useContext(SelectCtx);
    return <button onClick={() => onValueChange?.(value)}>{children}</button>;
  },
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => null,
}));

vi.mock("@/components/TipTapContentViewer", () => ({
  TipTapContentViewer: ({ content }: { content: string }) => (
    <div dangerouslySetInnerHTML={{ __html: content }} />
  ),
}));

vi.mock("@/components/Loading", () => ({
  __esModule: true,
  default: () => <div data-testid="loading" />,
}));

const letter = "Dear Hiring Manager,\n\nI build platforms.\n\nSincerely,";

const renderSheet = (props: Partial<any> = {}) =>
  render(
    <GenerateCoverLetterSection
      open
      triggerChange={vi.fn()}
      jobId="job-1"
      jobResumeId="resume-1"
      onSaved={vi.fn()}
      {...props}
    />,
  );

describe("GenerateCoverLetterSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (streamCoverLetter as any).mockResolvedValue(letter);
    (generateCoverLetterForJob as any).mockResolvedValue({
      success: true,
      data: { id: "cl-1", title: "Senior Engineer - Acme" },
    });
    (getDefaultResumeId as any).mockResolvedValue(null);
    (getResumeList as any).mockResolvedValue({
      success: true,
      data: [{ id: "resume-1", title: "Backend Resume" }],
    });
  });

  it("generates with the job's linked resume when there is one", async () => {
    renderSheet();
    await waitFor(() =>
      expect(streamCoverLetter).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: "job-1", resumeId: "resume-1" }),
      ),
    );
  });

  it("falls back to the default resume when the job has none", async () => {
    (getDefaultResumeId as any).mockResolvedValue("resume-1");
    renderSheet({ jobResumeId: null });
    await waitFor(() =>
      expect(streamCoverLetter).toHaveBeenCalledWith(
        expect.objectContaining({ resumeId: "resume-1" }),
      ),
    );
  });

  it("ignores a default resume that is not in the eligible list", async () => {
    (getDefaultResumeId as any).mockResolvedValue("resume-thin");
    renderSheet({ jobResumeId: null });
    await waitFor(() => expect(getResumeList).toHaveBeenCalled());
    expect(streamCoverLetter).not.toHaveBeenCalled();
  });

  it("shows a picker and generates on selection when nothing resolves", async () => {
    renderSheet({ jobResumeId: null });
    await userEvent.click(await screen.findByText("Backend Resume"));
    await waitFor(() =>
      expect(streamCoverLetter).toHaveBeenCalledWith(
        expect.objectContaining({ resumeId: "resume-1" }),
      ),
    );
  });

  it("prompts to create a resume when there are none eligible", async () => {
    (getResumeList as any).mockResolvedValue({ success: true, data: [] });
    renderSheet({ jobResumeId: null });
    expect(await screen.findByText(/create a resume/i)).toBeInTheDocument();
    expect(streamCoverLetter).not.toHaveBeenCalled();
  });

  it("renders the streamed letter", async () => {
    renderSheet();
    expect(await screen.findByText(/I build platforms/)).toBeInTheDocument();
  });

  it("saves the letter after a successful stream", async () => {
    const onSaved = vi.fn();
    renderSheet({ onSaved });
    await waitFor(() =>
      expect(generateCoverLetterForJob).toHaveBeenCalledWith("job-1", letter),
    );
    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith("cl-1", "Senior Engineer - Acme"),
    );
  });

  it("shows the saved title with a link to the profile", async () => {
    renderSheet();
    expect(
      await screen.findByText(/Senior Engineer - Acme/),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/dashboard/profile",
      ),
    );
  });

  it("does not save when the stream fails", async () => {
    (streamCoverLetter as any).mockRejectedValue(new Error("boom"));
    renderSheet();
    await waitFor(() => expect(streamCoverLetter).toHaveBeenCalled());
    expect(generateCoverLetterForJob).not.toHaveBeenCalled();
  });

  it("does not generate while closed", () => {
    renderSheet({ open: false });
    expect(streamCoverLetter).not.toHaveBeenCalled();
  });
});
