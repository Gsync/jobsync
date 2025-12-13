import AddResumeSummary from "@/components/profile/AddResumeSummary";
import {
  addResumeSummary,
  updateResumeSummary,
} from "@/actions/profile.actions";
import "@testing-library/jest-dom";
import { screen, render, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResumeSection } from "@/models/profile.model";

jest.mock("@/actions/profile.actions", () => ({
  addResumeSummary: jest.fn(),
  updateResumeSummary: jest.fn(),
}));

// Mock TiptapEditor component
jest.mock("@/components/TiptapEditor", () => {
  return function TiptapEditor({ field }: any) {
    return (
      <textarea
        data-testid="tiptap-editor"
        value={field.value || ""}
        onChange={(e) => field.onChange(e.target.value)}
        placeholder="Enter summary content"
      />
    );
  };
});

// Mock toast
jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

describe("AddResumeSummary Component", () => {
  const mockSetDialogOpen = jest.fn();
  const mockResumeId = "resume-123";
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render Add Summary dialog with correct title", () => {
    render(
      <AddResumeSummary
        resumeId={mockResumeId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    expect(screen.getByText("Add Summary")).toBeInTheDocument();
  });

  it("should render Edit Summary dialog when summaryToEdit is provided", () => {
    const mockSummaryToEdit: ResumeSection = {
      id: "summary-1",
      resumeId: mockResumeId,
      sectionTitle: "Professional Summary",
      sectionType: "summary" as any,
      summary: {
        content: "Experienced software developer",
      },
    };

    render(
      <AddResumeSummary
        resumeId={mockResumeId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
        summaryToEdit={mockSummaryToEdit}
      />
    );

    expect(screen.getByText("Edit Summary")).toBeInTheDocument();
  });

  it("should render all form fields correctly", () => {
    render(
      <AddResumeSummary
        resumeId={mockResumeId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    expect(screen.getByLabelText(/section title/i)).toBeInTheDocument();
    expect(screen.getByText(/resume summary/i)).toBeInTheDocument();
    expect(screen.getByTestId("tiptap-editor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("should populate form fields when editing a summary", () => {
    const mockSummaryToEdit: ResumeSection = {
      id: "summary-1",
      resumeId: mockResumeId,
      sectionTitle: "Professional Summary",
      sectionType: "summary" as any,
      summary: {
        content: "Experienced software developer with 5+ years",
      },
    };

    render(
      <AddResumeSummary
        resumeId={mockResumeId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
        summaryToEdit={mockSummaryToEdit}
      />
    );

    const sectionTitleInput = screen.getByLabelText(/section title/i);
    const contentEditor = screen.getByTestId("tiptap-editor");

    expect(sectionTitleInput).toHaveValue("Professional Summary");
    expect(contentEditor).toHaveValue(
      "Experienced software developer with 5+ years"
    );
  });

  it("should close dialog when Cancel button is clicked", async () => {
    render(
      <AddResumeSummary
        resumeId={mockResumeId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockSetDialogOpen).toHaveBeenCalledWith(false);
  });

  it("should disable Save button when form is not dirty", () => {
    render(
      <AddResumeSummary
        resumeId={mockResumeId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it("should call addResumeSummary when submitting a new summary", async () => {
    (addResumeSummary as jest.Mock).mockResolvedValue({
      success: true,
      message: "Summary created successfully",
    });

    render(
      <AddResumeSummary
        resumeId={mockResumeId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    const sectionTitleInput = screen.getByLabelText(/section title/i);
    const contentEditor = screen.getByTestId("tiptap-editor");

    await user.clear(sectionTitleInput);
    await user.type(sectionTitleInput, "Career Summary");

    fireEvent.change(contentEditor, {
      target: { value: "Experienced professional with strong skills" },
    });

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(addResumeSummary).toHaveBeenCalledTimes(1);
      expect(addResumeSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionTitle: "Career Summary",
          content: "Experienced professional with strong skills",
        })
      );
    });
  });

  it("should call updateResumeSummary when editing an existing summary", async () => {
    const mockSummaryToEdit: ResumeSection = {
      id: "summary-1",
      resumeId: mockResumeId,
      sectionTitle: "Professional Summary",
      sectionType: "summary" as any,
      summary: {
        content: "Experienced software developer",
      },
    };

    (updateResumeSummary as jest.Mock).mockResolvedValue({
      success: true,
      message: "Summary updated successfully",
    });

    render(
      <AddResumeSummary
        resumeId={mockResumeId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
        summaryToEdit={mockSummaryToEdit}
      />
    );

    const sectionTitleInput = screen.getByLabelText(/section title/i);
    await user.clear(sectionTitleInput);
    await user.type(sectionTitleInput, "Updated Professional Summary");

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(updateResumeSummary).toHaveBeenCalledTimes(1);
      expect(updateResumeSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "summary-1",
          sectionTitle: "Updated Professional Summary",
        })
      );
    });
  });

  it("should close dialog and show success toast on successful submission", async () => {
    const { toast } = require("@/components/ui/use-toast");

    (addResumeSummary as jest.Mock).mockResolvedValue({
      success: true,
      message: "Summary created successfully",
    });

    render(
      <AddResumeSummary
        resumeId={mockResumeId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    const sectionTitleInput = screen.getByLabelText(/section title/i);
    const contentEditor = screen.getByTestId("tiptap-editor");

    await user.clear(sectionTitleInput);
    await user.type(sectionTitleInput, "Career Summary");

    fireEvent.change(contentEditor, {
      target: { value: "Experienced professional with strong skills" },
    });

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockSetDialogOpen).toHaveBeenCalledWith(false);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "success",
          description: "Summary has been created successfully",
        })
      );
    });
  });

  it("should show error toast on failed submission", async () => {
    const { toast } = require("@/components/ui/use-toast");

    (addResumeSummary as jest.Mock).mockResolvedValue({
      success: false,
      message: "Failed to create summary",
    });

    render(
      <AddResumeSummary
        resumeId={mockResumeId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    const sectionTitleInput = screen.getByLabelText(/section title/i);
    const contentEditor = screen.getByTestId("tiptap-editor");

    await user.clear(sectionTitleInput);
    await user.type(sectionTitleInput, "Career Summary");

    fireEvent.change(contentEditor, {
      target: { value: "Experienced professional with strong skills" },
    });

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          title: "Error!",
          description: "Failed to create summary",
        })
      );
      expect(mockSetDialogOpen).not.toHaveBeenCalledWith(false);
    });
  });

  it("should display loading indicator when form is submitting", async () => {
    (addResumeSummary as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ success: true }), 100);
        })
    );

    render(
      <AddResumeSummary
        resumeId={mockResumeId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    const sectionTitleInput = screen.getByLabelText(/section title/i);
    const contentEditor = screen.getByTestId("tiptap-editor");

    await user.clear(sectionTitleInput);
    await user.type(sectionTitleInput, "Career Summary");

    fireEvent.change(contentEditor, {
      target: { value: "Experienced professional with strong skills" },
    });

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    // Check if the loader icon is present
    const loader = screen
      .getByText(/save/i)
      .parentElement?.querySelector(".spinner");
    expect(loader).toBeInTheDocument();

    await waitFor(() => {
      expect(addResumeSummary).toHaveBeenCalledTimes(1);
    });
  });

  it("should show updated success message when editing", async () => {
    const { toast } = require("@/components/ui/use-toast");

    const mockSummaryToEdit: ResumeSection = {
      id: "summary-1",
      resumeId: mockResumeId,
      sectionTitle: "Professional Summary",
      sectionType: "summary" as any,
      summary: {
        content: "Experienced software developer",
      },
    };

    (updateResumeSummary as jest.Mock).mockResolvedValue({
      success: true,
      message: "Summary updated successfully",
    });

    render(
      <AddResumeSummary
        resumeId={mockResumeId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
        summaryToEdit={mockSummaryToEdit}
      />
    );

    const sectionTitleInput = screen.getByLabelText(/section title/i);
    await user.clear(sectionTitleInput);
    await user.type(sectionTitleInput, "Updated Professional Summary");

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "success",
          description: "Summary has been updated successfully",
        })
      );
    });
  });

  it("should not render dialog when dialogOpen is false", () => {
    const { container } = render(
      <AddResumeSummary
        resumeId={mockResumeId}
        dialogOpen={false}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    expect(screen.queryByText("Add Summary")).not.toBeInTheDocument();
  });

  it("should handle dialog open state change", async () => {
    const { rerender } = render(
      <AddResumeSummary
        resumeId={mockResumeId}
        dialogOpen={false}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    expect(screen.queryByText("Add Summary")).not.toBeInTheDocument();

    rerender(
      <AddResumeSummary
        resumeId={mockResumeId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    expect(screen.getByText("Add Summary")).toBeInTheDocument();
  });
});
