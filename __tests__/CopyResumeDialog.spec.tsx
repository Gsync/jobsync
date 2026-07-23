import CopyResumeDialog from "@/components/profile/CopyResumeDialog";
import { ProfileDocument } from "@/models/profile.model";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  copyResume,
  getResumeCopyTitleSuggestion,
} from "@/actions/profile.actions";

vi.mock("@/actions/profile.actions", () => ({
  copyResume: vi.fn(),
  getResumeCopyTitleSuggestion: vi.fn(),
}));

const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  toast: (args: any) => mockToast(args),
}));

const sourceDoc: ProfileDocument = {
  id: "resume-1",
  title: "Backend Resume",
  type: "resume",
  createdAt: new Date(),
  updatedAt: new Date(),
  jobCount: 0,
  sectionCount: 4,
};

describe("CopyResumeDialog", () => {
  const setOpen = vi.fn();
  const onCopied = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (getResumeCopyTitleSuggestion as any).mockResolvedValue({
      success: true,
      data: "Backend Resume (Copy)",
    });
    (copyResume as any).mockResolvedValue({
      success: true,
      data: { id: "resume-2", title: "Backend Resume (Copy)" },
    });
  });

  const renderDialog = () =>
    render(
      <CopyResumeDialog
        open={true}
        setOpen={setOpen}
        sourceDoc={sourceDoc}
        onCopied={onCopied}
      />,
    );

  it("pre-fills the suggested title when opened", async () => {
    renderDialog();

    expect(getResumeCopyTitleSuggestion).toHaveBeenCalledWith("resume-1");
    await waitFor(() =>
      expect(screen.getByTestId("copy-resume-title-input")).toHaveValue(
        "Backend Resume (Copy)",
      ),
    );
  });

  it("states that the attachment is not copied", async () => {
    renderDialog();
    expect(screen.getByText(/attachment is not copied/i)).toBeInTheDocument();
  });

  it("submits the copy and notifies the parent on success", async () => {
    const user = userEvent.setup();
    renderDialog();

    await waitFor(() =>
      expect(screen.getByTestId("copy-resume-title-input")).toHaveValue(
        "Backend Resume (Copy)",
      ),
    );
    await user.click(screen.getByRole("button", { name: /create copy/i }));

    await waitFor(() =>
      expect(copyResume).toHaveBeenCalledWith(
        "resume-1",
        "Backend Resume (Copy)",
      ),
    );
    await waitFor(() => expect(onCopied).toHaveBeenCalled());
    expect(setOpen).toHaveBeenCalledWith(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "success" }),
    );
  });

  it("shows a destructive toast and stays open when the copy fails", async () => {
    (copyResume as any).mockResolvedValue({
      success: false,
      message: "Failed to copy resume.",
    });
    const user = userEvent.setup();
    renderDialog();

    await waitFor(() =>
      expect(screen.getByTestId("copy-resume-title-input")).toHaveValue(
        "Backend Resume (Copy)",
      ),
    );
    await user.click(screen.getByRole("button", { name: /create copy/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          description: "Failed to copy resume.",
        }),
      ),
    );
    expect(onCopied).not.toHaveBeenCalled();
  });
});
