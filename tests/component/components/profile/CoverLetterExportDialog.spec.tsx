import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CoverLetterExportDialog } from "@/components/profile/CoverLetterExportDialog";
import type { ContactInfo } from "@/models/profile.model";

const generateCoverLetterPdfBlob = vi.fn(async () => ({
  blob: new Blob(),
  filename: "x.pdf",
}));
vi.mock("@/components/profile/cover-letter-pdf/generateCoverLetterPdf", () => ({
  generateCoverLetterPdfBlob: (...args: unknown[]) =>
    generateCoverLetterPdfBlob(...(args as [])),
}));

// Captures what the dialog hands the preview, without rendering a PDF.
const preview = vi.hoisted(() => ({
  generate: null as null | ((input: object) => Promise<unknown>),
  input: null as null | Record<string, unknown>,
}));
vi.mock("@/components/pdf-export/usePdfPreview", () => ({
  usePdfPreview: (
    generate: (input: object) => Promise<unknown>,
    input: Record<string, unknown>,
  ) => {
    preview.generate = generate;
    preview.input = input;
    return { blob: null, filename: null, isGenerating: false, error: null };
  },
}));

vi.mock("@/components/pdf-export/PdfExportDialog", () => ({
  PdfExportDialog: ({ settingsPanel }: { settingsPanel: React.ReactNode }) => (
    <div>{settingsPanel}</div>
  ),
}));

const contactInfo = {
  firstName: "Ada",
  lastName: "Lovelace",
  headline: "Engineer",
} as ContactInfo;

const renderDialog = (props: { open?: boolean } = {}) =>
  render(
    <CoverLetterExportDialog
      open={props.open ?? true}
      onOpenChange={vi.fn()}
      letter={{ title: "Acme", content: "<p>Hi</p>" }}
      contactInfo={contactInfo}
    />,
  );

const lastLetterhead = async () => {
  await act(async () => {
    await preview.generate!(preview.input!);
  });
  const calls = generateCoverLetterPdfBlob.mock.calls as unknown[][];
  return calls[calls.length - 1][1] as ContactInfo;
};

beforeEach(() => localStorage.clear());

describe("CoverLetterExportDialog — headline", () => {
  it("prefills from the default resume's headline", async () => {
    renderDialog();
    expect(screen.getByLabelText("Headline")).toHaveValue("Engineer");
    expect((await lastLetterhead()).headline).toBe("Engineer");
  });

  it("prints the edited headline", async () => {
    const user = userEvent.setup();
    renderDialog();
    const input = screen.getByLabelText("Headline");
    await user.clear(input);
    await user.type(input, "Staff Engineer");
    expect(preview.input!.headline).toBe("Staff Engineer");
    expect((await lastLetterhead()).headline).toBe("Staff Engineer");
  });

  // The template skips a falsy headline, so blank must arrive as "".
  it("drops the headline when the box is blank or whitespace", async () => {
    const user = userEvent.setup();
    renderDialog();
    const input = screen.getByLabelText("Headline");
    await user.clear(input);
    await user.type(input, "   ");
    expect((await lastLetterhead()).headline).toBe("");
  });

  it("is not remembered once the dialog closes", async () => {
    const user = userEvent.setup();
    const { rerender } = renderDialog();
    await user.type(screen.getByLabelText("Headline"), " II");
    const props = {
      onOpenChange: vi.fn(),
      letter: { title: "Acme", content: "<p>Hi</p>" },
      contactInfo,
    };
    rerender(<CoverLetterExportDialog open={false} {...props} />);
    rerender(<CoverLetterExportDialog open {...props} />);
    expect(screen.getByLabelText("Headline")).toHaveValue("Engineer");
  });

  it("restores the resume's headline on reset", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText("Headline"), " II");
    await user.click(screen.getByRole("button", { name: "Reset to defaults" }));
    expect(screen.getByLabelText("Headline")).toHaveValue("Engineer");
  });
});
