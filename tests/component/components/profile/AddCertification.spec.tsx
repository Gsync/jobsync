import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddCertification from "@/components/profile/AddCertification";
import { addCertification, updateCertification } from "@/actions/profile.actions";
import { toastSuccess } from "@/lib/toast";
import { ResumeSection } from "@/models/profile.model";

vi.mock("@/actions/profile.actions", () => ({
  addCertification: vi.fn(),
  updateCertification: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

function renderDialog({ certificationToEdit, setDialogOpen = vi.fn() }: {
  certificationToEdit?: ResumeSection;
  setDialogOpen?: (open: boolean) => void;
} = {}) {
  render(
    <AddCertification
      resumeId="resume-1"
      sectionId="section-1"
      dialogOpen={true}
      setDialogOpen={setDialogOpen}
      certificationToEdit={certificationToEdit}
    />,
  );
}

async function openYearOptions(label: string) {
  const item = screen.getByText(label).closest("div")!;
  await userEvent.click(within(item).getByRole("button"));
  const year = await screen.findByRole("combobox", { name: "Choose the Year" });
  return within(year)
    .getAllByRole("option")
    .map((o) => Number(o.textContent));
}

async function selectDate(label: string, date: Date): Promise<void> {
  const item = screen.getByText(label).closest("div")!;
  await userEvent.click(within(item).getByRole("button"));
  await userEvent.selectOptions(
    await screen.findByRole("combobox", { name: "Choose the Year" }),
    String(date.getFullYear()),
  );
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: "Choose the Month" }),
    String(date.getMonth()),
  );
  const day = Array.from(document.querySelectorAll<HTMLButtonElement>("button[data-day]"))
    .find((button) => button.dataset.day === date.toLocaleDateString());
  if (!day) throw new Error("Expected the requested calendar day to be available");
  await userEvent.click(day);
}

describe("AddCertification date pickers", () => {
  it.each(["add", "edit"])("shows the date-order error under the ending picker and saves after correction (%s)", async (mode) => {
    const user = userEvent.setup();
    const mockSetDialogOpen = vi.fn();
    vi.mocked(addCertification).mockReset();
    vi.mocked(updateCertification).mockReset();
    vi.mocked(toastSuccess).mockClear();
    const saveAction = mode === "add" ? addCertification : updateCertification;
    const otherAction = mode === "add" ? updateCertification : addCertification;
    vi.mocked(saveAction).mockResolvedValue({ success: true });
    const section: ResumeSection = {
      id: "section-1",
      resumeId: "resume-1",
      sectionTitle: "Certifications",
      sectionType: "certification" as any,
      licenseOrCertifications: [{
        id: "cert-1",
        title: "AWS SAA",
        organization: "Amazon",
        issueDate: new Date(2020, 0, 1),
        expirationDate: new Date(2024, 0, 1),
        credentialUrl: "https://example.com/credential",
      }],
    };
    renderDialog({
      certificationToEdit: mode === "edit" ? section : undefined,
      setDialogOpen: mockSetDialogOpen,
    });
    if (mode === "add") {
      await user.type(screen.getByLabelText("Certification / License Name"), "AWS SAA");
      await user.type(screen.getByLabelText("Issuing Organization"), "Amazon");
    }
    await selectDate("Issue Date", new Date(2026, 10, 1));
    await selectDate("Expiration Date", new Date(2014, 10, 12));
    await user.click(screen.getByRole("button", { name: /save/i }));

    const item = screen.getByText("Expiration Date").closest("div")!;
    const message = "Expiration date must be on or after the issue date";
    expect(await within(item).findByText(message)).toBeInTheDocument();
    expect(addCertification).not.toHaveBeenCalled();
    expect(updateCertification).not.toHaveBeenCalled();
    expect(mockSetDialogOpen).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(toastSuccess).not.toHaveBeenCalled();

    await selectDate("Expiration Date", new Date(2026, 10, 2));
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(mockSetDialogOpen).toHaveBeenCalledWith(false));
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    expect(saveAction).toHaveBeenCalledTimes(1);
    expect(saveAction).toHaveBeenCalledWith(expect.objectContaining({
      expirationDate: new Date(2026, 10, 2),
    }));
    expect(otherAction).not.toHaveBeenCalled();
  }, 10000);

  it("lets the expiration date reach future years", async () => {
    renderDialog();
    const years = await openYearOptions("Expiration Date");
    expect(Math.max(...years)).toBeGreaterThan(new Date().getFullYear());
  });

  it("keeps the issue date capped at the current year", async () => {
    renderDialog();
    const years = await openYearOptions("Issue Date");
    expect(Math.max(...years)).toBe(new Date().getFullYear());
  });
});
