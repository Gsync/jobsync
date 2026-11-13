import { render, screen } from "@testing-library/react";
import DocumentTable from "@/components/profile/ResumeTable";
import { buildIncompleteResumeHint } from "@/lib/resumeSections";

vi.mock("@/actions/profile.actions", () => ({
  deleteResumeById: vi.fn(),
  setDefaultResume: vi.fn(),
}));
vi.mock("@/actions/coverLetter.actions", () => ({
  deleteCoverLetterById: vi.fn(),
}));

const base = {
  type: "resume" as const,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  jobCount: 0,
};

const renderTable = (documents: any[]) =>
  render(
    <DocumentTable
      documents={documents}
      editResume={vi.fn()}
      editCoverLetter={vi.fn()}
      exportCoverLetter={vi.fn()}
      copyResume={vi.fn()}
      reloadDocuments={vi.fn()}
    />,
  );

describe("ResumeTable incomplete marker", () => {
  it("marks a resume below the section minimum, including attachment-only", () => {
    renderTable([
      { ...base, id: "r1", title: "Draft", sectionCount: 0, FileId: "f1" },
    ]);

    expect(
      screen.getByRole("img", { name: buildIncompleteResumeHint() }),
    ).toBeInTheDocument();
  });

  it("does not mark a complete resume", () => {
    renderTable([{ ...base, id: "r2", title: "CV", sectionCount: 3 }]);

    expect(
      screen.queryByRole("img", { name: buildIncompleteResumeHint() }),
    ).not.toBeInTheDocument();
  });

  it("does not mark a cover letter", () => {
    renderTable([
      { ...base, id: "c1", type: "coverLetter", title: "Letter" },
    ]);

    expect(
      screen.queryByRole("img", { name: buildIncompleteResumeHint() }),
    ).not.toBeInTheDocument();
  });
});
