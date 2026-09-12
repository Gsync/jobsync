import AddContact from "@/components/AddContact";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createContact, updateContact } from "@/actions/contact.actions";

vi.mock("@/actions/contact.actions", () => ({
  createContact: vi.fn(),
  updateContact: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastActionResult: vi.fn((res, opts) => res?.success && opts?.onSuccess?.()),
}));

const props = {
  reloadContacts: vi.fn(),
  resetEditContact: vi.fn(),
  dialogOpen: true,
  setDialogOpen: vi.fn(),
  companies: [{ id: "co1", label: "Shopify", value: "shopify", createdBy: "u1" }],
  locations: [{ id: "l1", label: "Toronto, ON", value: "toronto on", createdBy: "u1" }],
  roles: [
    { id: "r1", label: "Reference", value: "reference", createdBy: "u1" },
    { id: "r2", label: "Recruiter", value: "recruiter", createdBy: "u1" },
  ],
} as any;

// jsdom lacks scrollIntoView, which cmdk calls when selecting an item
Element.prototype.scrollIntoView = vi.fn();

describe("AddContact", () => {
  const user = userEvent.setup({ skipHover: true });
  beforeEach(() => vi.clearAllMocks());

  it("saves a contact with just a name", async () => {
    (createContact as any).mockResolvedValue({ success: true, data: { id: "c1" } });

    render(<AddContact {...props} />);
    await user.type(screen.getByLabelText(/^name$/i), "Dave Patel");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(createContact).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Dave Patel" }),
      ),
    );
  });

  it("blocks a save with no name", async () => {
    render(<AddContact {...props} />);
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText(/name is required|cannot be empty/i)).toBeInTheDocument();
    expect(createContact).not.toHaveBeenCalled();
  });

  it("prefills the name when asked", () => {
    render(<AddContact {...props} prefillName="Priya" />);
    expect(screen.getByLabelText(/^name$/i)).toHaveValue("Priya");
  });

  it("updates instead of creating when editing", async () => {
    (updateContact as any).mockResolvedValue({ success: true, data: { id: "c1" } });

    render(
      <AddContact
        {...props}
        editContact={{ id: "c1", name: "Dave Patel" } as any}
      />,
    );
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(updateContact).toHaveBeenCalledWith(
        expect.objectContaining({ id: "c1", name: "Dave Patel" }),
      ),
    );
    expect(createContact).not.toHaveBeenCalled();
  });

  it("carries the standing role through to the action", async () => {
    (updateContact as any).mockResolvedValue({ success: true, data: { id: "c1" } });

    render(
      <AddContact
        {...props}
        editContact={{ id: "c1", name: "Dave Patel", roleId: "r1" } as any}
      />,
    );
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(updateContact).toHaveBeenCalledWith(
        expect.objectContaining({ contactRole: "r1" }),
      ),
    );
  });

  it("hides the shared-history fields until the role is Reference", () => {
    render(<AddContact {...props} />);

    expect(screen.queryByText(/how you know them/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/relationship/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/worked together at/i)).not.toBeInTheDocument();
  });

  it("shows the shared-history fields for a Reference contact", () => {
    render(
      <AddContact
        {...props}
        editContact={{ id: "c1", name: "Dave Patel", roleId: "r1" } as any}
      />,
    );

    expect(screen.getByText(/how you know them/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/relationship/i)).toBeInTheDocument();
    expect(screen.getByText(/worked together at/i)).toBeInTheDocument();
  });

  it("clears the shared history when the role moves off Reference", async () => {
    (updateContact as any).mockResolvedValue({ success: true, data: { id: "c1" } });

    render(
      <AddContact
        {...props}
        editContact={
          {
            id: "c1",
            name: "Dave Patel",
            roleId: "r1",
            relationship: "my manager",
          } as any
        }
      />,
    );

    await user.click(screen.getByRole("combobox", { name: /role/i }));
    await user.click(await screen.findByRole("option", { name: /recruiter/i }));

    expect(screen.queryByLabelText(/relationship/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(updateContact).toHaveBeenCalledWith(
        expect.objectContaining({ contactRole: "r2", relationship: "" }),
      ),
    );
  });

  it("hands the saved contact back to the caller", async () => {
    (createContact as any).mockResolvedValue({ success: true, data: { id: "c9" } });
    const onSaved = vi.fn();

    render(<AddContact {...props} onSaved={onSaved} />);
    await user.type(screen.getByLabelText(/^name$/i), "Priya Nair");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith({
        id: "c9",
        label: "Priya Nair",
        value: "priya nair",
      }),
    );
  });
});
