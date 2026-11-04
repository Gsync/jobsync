import CreateResume from "@/components/profile/CreateResume";
import { Resume } from "@/models/profile.model";
import { getUserSettings } from "@/actions/userSettings.actions";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/actions/userSettings.actions", () => ({
  getUserSettings: vi.fn().mockResolvedValue({ success: false }),
}));

describe("CreateResume Component", () => {
  const mockReloadResumes = vi.fn();
  const mockSetResumeDialogOpen = vi.fn();
  const mockSetNewResumeId = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });
  const renderComponent = (resumeToEdit?: Resume) => {
    render(
      <CreateResume
        resumeDialogOpen={true}
        setResumeDialogOpen={mockSetResumeDialogOpen}
        resumeToEdit={resumeToEdit}
        reloadResumes={mockReloadResumes}
        setNewResumeId={mockSetNewResumeId}
      />
    );
  };
  it("should render the dialog when resumeDialogOpen is true", () => {
    renderComponent();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/create resume/i)).toBeInTheDocument();
  });

  it("should display the correct title when editing a resume", () => {
    const mockResumeToEdit = {
      id: "resume-id",
      title: "Test Resume",
      FileId: "file-id",
    } as Resume;

    renderComponent(mockResumeToEdit);

    expect(screen.getByText(/edit resume title/i)).toBeInTheDocument();

    const titleInput = screen.getByTestId("resume-title-input");
    expect(titleInput).toHaveValue("Test Resume");
  });

  it("should display the correct title when creating a new resume", () => {
    renderComponent();

    expect(screen.getByText(/create resume/i)).toBeInTheDocument();

    const titleInput = screen.getByTestId("resume-title-input");
    expect(titleInput).toHaveValue("");
  });

  it("should call setResumeDialogOpen with false when cancel button is clicked", () => {
    renderComponent();

    const cancelButton = screen.getByRole("button", { name: /cancel/i });

    fireEvent.click(cancelButton);

    expect(mockSetResumeDialogOpen).toHaveBeenCalledWith(false);
  });

  it("should display validation errors when form is invalid", async () => {
    renderComponent();

    const titleInput = screen.getByTestId("resume-title-input");
    fireEvent.change(titleInput, { target: { value: "Temporary Title" } });
    fireEvent.change(titleInput, { target: { value: "" } });

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeDisabled();
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/resume title is required/i)).toBeInTheDocument();
    });
  });

  it("opens the new resume, not the new profile, on a first upload with auto-fill", async () => {
    vi.mocked(getUserSettings).mockResolvedValueOnce({
      success: true,
      data: { settings: { ai: { provider: "openai", model: "gpt" } } },
    } as any);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          success: true,
          data: { id: "profile-1", resumes: [{ id: "resume-1" }] },
        }),
      }),
    );
    renderComponent();

    const file = new File(["%PDF"], "my_cv.pdf", { type: "application/pdf" });
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });
    await waitFor(() => expect(screen.getByRole("switch")).toBeChecked());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save/i })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(mockPush).toHaveBeenCalledWith("/dashboard/profile/resume/resume-1");
    expect(sessionStorage.getItem("import-pending:resume-1")).not.toBeNull();
  });
});
