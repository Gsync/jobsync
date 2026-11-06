import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddCertification from "@/components/profile/AddCertification";

vi.mock("@/actions/profile.actions", () => ({
  addCertification: vi.fn(),
  updateCertification: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

function renderDialog() {
  render(
    <AddCertification
      resumeId="resume-1"
      sectionId="section-1"
      dialogOpen={true}
      setDialogOpen={vi.fn()}
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

describe("AddCertification date pickers", () => {
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
