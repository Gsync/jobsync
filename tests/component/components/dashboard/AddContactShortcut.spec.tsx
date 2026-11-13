import AddContactShortcut from "@/components/dashboard/AddContactShortcut";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getAllCompanies } from "@/actions/company.actions";
import { getAllJobLocations } from "@/actions/jobLocation.actions";
import { getAllContactRoles } from "@/actions/contactRole.actions";

vi.mock("@/actions/company.actions", () => ({ getAllCompanies: vi.fn() }));
vi.mock("@/actions/jobLocation.actions", () => ({
  getAllJobLocations: vi.fn(),
}));
vi.mock("@/actions/contactRole.actions", () => ({
  getAllContactRoles: vi.fn(),
}));

vi.mock("@/components/AddContact", () => ({
  __esModule: true,
  default: ({ dialogOpen, setDialogOpen, companies, locations, roles }: any) =>
    dialogOpen ? (
      <div data-testid="add-contact-dialog">
        <span data-testid="picker-counts">
          {companies.length}/{locations.length}/{roles.length}
        </span>
        <button type="button" onClick={() => setDialogOpen(false)}>
          Close
        </button>
      </div>
    ) : null,
}));

describe("AddContactShortcut", () => {
  const user = userEvent.setup({ skipHover: true });

  beforeEach(() => {
    vi.clearAllMocks();
    (getAllCompanies as any).mockResolvedValue([
      { id: "co1", label: "Shopify", value: "shopify", createdBy: "u1" },
    ]);
    (getAllJobLocations as any).mockResolvedValue([
      { id: "l1", label: "Toronto, ON", value: "toronto on", createdBy: "u1" },
    ]);
    (getAllContactRoles as any).mockResolvedValue([
      { id: "r1", label: "Recruiter", value: "recruiter", createdBy: "u1" },
      { id: "r2", label: "Reference", value: "reference", createdBy: "u1" },
    ]);
  });

  it("keeps the dialog closed and fetches nothing until the button is clicked", () => {
    render(<AddContactShortcut />);

    expect(screen.getByRole("button", { name: /add contact/i })).toBeTruthy();
    expect(screen.queryByTestId("add-contact-dialog")).toBeNull();
    expect(getAllCompanies).not.toHaveBeenCalled();
  });

  it("opens the dialog and hands it the fetched picker options", async () => {
    render(<AddContactShortcut />);

    await user.click(screen.getByRole("button", { name: /add contact/i }));

    expect(screen.getByTestId("add-contact-dialog")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByTestId("picker-counts").textContent).toBe("1/1/2"),
    );
  });

  it("fetches the picker options only once across reopens", async () => {
    render(<AddContactShortcut />);

    await user.click(screen.getByRole("button", { name: /add contact/i }));
    await waitFor(() => expect(getAllCompanies).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: /close/i }));
    await user.click(screen.getByRole("button", { name: /add contact/i }));

    expect(getAllCompanies).toHaveBeenCalledTimes(1);
    expect(getAllJobLocations).toHaveBeenCalledTimes(1);
    expect(getAllContactRoles).toHaveBeenCalledTimes(1);
  });
});
