import { fireEvent, render, screen } from "@testing-library/react";
import type { ControllerRenderProps } from "react-hook-form";
import CreateCoverLetter from "@/components/profile/CreateCoverLetter";
import type { CoverLetter } from "@/models/profile.model";

vi.mock("@/actions/coverLetter.actions", () => ({
  createCoverLetter: vi.fn(),
  updateCoverLetter: vi.fn(),
}));
vi.mock("@/components/TiptapEditor", () => ({
  default: ({ field }: { field: ControllerRenderProps }) => (
    <textarea aria-label="Letter content" value={field.value} onChange={field.onChange} />
  ),
}));
vi.mock("@/components/profile/CoverLetterExportDialog", () => ({
  CoverLetterExportDialog: ({ open, letter }: {
    open: boolean;
    letter: { title: string; content: string };
  }) => open && <output aria-label="Exported letter">{letter.title}: {letter.content}</output>,
}));

const props = {
  dialogOpen: true,
  setDialogOpen: vi.fn(),
  reloadDocuments: vi.fn(),
  contactInfo: null,
};

describe("CreateCoverLetter subscriptions", () => {
  it("exports current unsaved title and content and disables export when cleared", () => {
    render(<CreateCoverLetter {...props} />);
    const exportButton = screen.getByRole("button", { name: "Export to PDF" });
    expect(exportButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Cover Letter Title"), { target: { value: "Acme" } });
    fireEvent.change(screen.getByLabelText("Letter content"), { target: { value: "<p>Dear team</p>" } });
    expect(exportButton).toBeEnabled();
    fireEvent.click(exportButton);
    expect(screen.getByLabelText("Exported letter")).toHaveTextContent("Acme: <p>Dear team</p>");

    fireEvent.change(screen.getByLabelText("Letter content"), { target: { value: "<p></p>" } });
    expect(exportButton).toBeDisabled();
  });

  it("updates export values after switching the edited letter", () => {
    const first = { id: "letter-1", title: "First", content: "<p>First letter</p>" } as CoverLetter;
    const second = { id: "letter-2", title: "Second", content: "<p>Second letter</p>" } as CoverLetter;
    const { rerender } = render(<CreateCoverLetter {...props} coverLetterToEdit={first} />);
    fireEvent.click(screen.getByRole("button", { name: "Export to PDF" }));
    expect(screen.getByLabelText("Exported letter")).toHaveTextContent("First: <p>First letter</p>");

    rerender(<CreateCoverLetter {...props} coverLetterToEdit={second} />);
    expect(screen.getByLabelText("Exported letter")).toHaveTextContent("Second: <p>Second letter</p>");
    rerender(<CreateCoverLetter {...props} />);
    expect(screen.getByRole("button", { name: "Export to PDF" })).toBeDisabled();
  });
});
