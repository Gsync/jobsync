import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddContactInfo from "@/components/profile/AddContactInfo";
import { addContactInfo, updateContactInfo } from "@/actions/profile.actions";
import { toast } from "@/components/ui/use-toast";

vi.mock("@/actions/profile.actions", () => ({
  addContactInfo: vi.fn(),
  updateContactInfo: vi.fn(),
}));

vi.mock("@/components/ui/use-toast", () => ({ toast: vi.fn() }));

const contactInfoToEdit = {
  id: "contact-1",
  resumeId: "resume-123",
  firstName: "Ada",
  lastName: "Lovelace",
  headline: "Software Engineer",
  email: "ada@example.com",
  phone: "555-0100",
  address: "London",
  url1: "https://linkedin.com/in/ada",
  url1Label: "LinkedIn",
  url2: null,
  url2Label: null,
};

describe("AddContactInfo Component", () => {
  const user = userEvent.setup();
  const mockResumeId = "resume-123";
  const mockSetDialogOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderNew = () =>
    render(
      <AddContactInfo
        resumeId={mockResumeId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />,
    );

  const renderEdit = (overrides: Record<string, unknown> = {}) =>
    render(
      <AddContactInfo
        resumeId={mockResumeId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
        contactInfoToEdit={{ ...contactInfoToEdit, ...overrides } as any}
      />,
    );

  const fillRequiredFields = async () => {
    await user.type(screen.getByLabelText("First Name"), "Grace");
    await user.type(screen.getByLabelText("Last Name"), "Hopper");
    await user.type(screen.getByLabelText("Headline"), "Rear Admiral");
    await user.type(screen.getByLabelText("Email"), "grace@example.com");
    await user.type(screen.getByLabelText("Phone"), "555-0199");
  };

  it("renders the Add title and all contact fields", async () => {
    renderNew();

    await waitFor(() => {
      expect(screen.getByText("Add Contact Info")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Headline")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone")).toBeInTheDocument();
    expect(screen.getByLabelText("Address")).toBeInTheDocument();
  });

  it("renders the Edit title and populates the fields", async () => {
    renderEdit();

    await waitFor(() => {
      expect(screen.getByText("Edit Contact Info")).toBeInTheDocument();
    });
    expect((screen.getByLabelText("First Name") as HTMLInputElement).value).toBe(
      "Ada",
    );
    expect((screen.getByLabelText("Last Name") as HTMLInputElement).value).toBe(
      "Lovelace",
    );
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe(
      "ada@example.com",
    );
    expect((screen.getByLabelText("Phone") as HTMLInputElement).value).toBe(
      "555-0100",
    );
  });

  it("does not render the dialog when closed", () => {
    const { container } = render(
      <AddContactInfo
        resumeId={mockResumeId}
        dialogOpen={false}
        setDialogOpen={mockSetDialogOpen}
      />,
    );

    expect(screen.queryByText("Add Contact Info")).not.toBeInTheDocument();
    expect(container.querySelector("form")).not.toBeInTheDocument();
  });

  it("keeps Save disabled until the form is edited", async () => {
    renderNew();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
    });

    await user.type(screen.getByLabelText("First Name"), "G");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).not.toBeDisabled();
    });
  });

  it("closes the dialog when Cancel is clicked", async () => {
    renderNew();

    await waitFor(() => {
      expect(screen.getByText("Add Contact Info")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockSetDialogOpen).toHaveBeenCalledWith(false);
  });

  describe("second link", () => {
    it("is collapsed behind a toggle for a new contact", async () => {
      renderNew();

      await waitFor(() => {
        expect(screen.getByText("Link 1")).toBeInTheDocument();
      });
      expect(screen.queryByText("Link 2")).not.toBeInTheDocument();
      expect(screen.getByText("+ Add another link")).toBeInTheDocument();
    });

    it("expands when the toggle is clicked", async () => {
      renderNew();

      await user.click(await screen.findByText("+ Add another link"));

      await waitFor(() => {
        expect(screen.getByText("Link 2")).toBeInTheDocument();
      });
      expect(screen.queryByText("+ Add another link")).not.toBeInTheDocument();
    });

    it("starts expanded when the contact already has a second link", async () => {
      renderEdit({ url2: "https://github.com/ada", url2Label: "GitHub" });

      await waitFor(() => {
        expect(screen.getByText("Link 2")).toBeInTheDocument();
      });
      expect(screen.getByDisplayValue("https://github.com/ada")).toBeInTheDocument();
    });

    it("clears the second link values when removed", async () => {
      renderEdit({ url2: "https://github.com/ada", url2Label: "GitHub" });

      await waitFor(() => {
        expect(screen.getByText("Link 2")).toBeInTheDocument();
      });
      const removeButton = screen
        .getByText("Link 2")
        .parentElement!.querySelector("button")!;
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText("Link 2")).not.toBeInTheDocument();
      });
      expect(
        screen.queryByDisplayValue("https://github.com/ada"),
      ).not.toBeInTheDocument();
    });
  });

  describe("submission", () => {
    it("calls addContactInfo with the resume id for a new contact", async () => {
      (addContactInfo as any).mockResolvedValue({ success: true });

      renderNew();
      await fillRequiredFields();
      await user.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => {
        expect(addContactInfo).toHaveBeenCalledTimes(1);
      });
      expect(addContactInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          resumeId: mockResumeId,
          firstName: "Grace",
          lastName: "Hopper",
          headline: "Rear Admiral",
          email: "grace@example.com",
          phone: "555-0199",
        }),
      );
      expect(updateContactInfo).not.toHaveBeenCalled();
    });

    it("calls updateContactInfo with the contact id when editing", async () => {
      (updateContactInfo as any).mockResolvedValue({ success: true });

      renderEdit();
      await waitFor(() => {
        expect(
          (screen.getByLabelText("Headline") as HTMLInputElement).value,
        ).toBe("Software Engineer");
      });

      const headline = screen.getByLabelText("Headline");
      await user.clear(headline);
      await user.type(headline, "Principal Engineer");
      await user.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => {
        expect(updateContactInfo).toHaveBeenCalledTimes(1);
      });
      expect(updateContactInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "contact-1",
          headline: "Principal Engineer",
        }),
      );
      expect(addContactInfo).not.toHaveBeenCalled();
    });

    it("closes the dialog and shows a success toast when the action succeeds", async () => {
      (addContactInfo as any).mockResolvedValue({ success: true });

      renderNew();
      await fillRequiredFields();
      await user.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => {
        expect(mockSetDialogOpen).toHaveBeenCalledWith(false);
      });
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "success",
          description: expect.stringContaining("created"),
        }),
      );
    });

    it("shows an updated success message when editing", async () => {
      (updateContactInfo as any).mockResolvedValue({ success: true });

      renderEdit();
      const headline = await screen.findByLabelText("Headline");
      await user.clear(headline);
      await user.type(headline, "Principal Engineer");
      await user.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: "success",
            description: expect.stringContaining("updated"),
          }),
        );
      });
    });

    it("keeps the dialog open and shows an error toast when the action fails", async () => {
      (addContactInfo as any).mockResolvedValue({
        success: false,
        message: "Failed to create contact info.",
      });

      renderNew();
      await fillRequiredFields();
      await user.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: "destructive",
            title: "Error",
            description: "Failed to create contact info.",
          }),
        );
      });
      expect(mockSetDialogOpen).not.toHaveBeenCalledWith(false);
    });
  });

  describe("validation", () => {
    it("blocks submission and reports a malformed email", async () => {
      renderNew();
      await user.type(screen.getByLabelText("First Name"), "Grace");
      await user.type(screen.getByLabelText("Last Name"), "Hopper");
      await user.type(screen.getByLabelText("Headline"), "Rear Admiral");
      await user.type(screen.getByLabelText("Email"), "not-an-email");
      await user.type(screen.getByLabelText("Phone"), "555-0199");

      await user.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Please enter a valid email!"),
        ).toBeInTheDocument();
      });
      expect(addContactInfo).not.toHaveBeenCalled();
    });

    it("blocks submission of a link without a scheme", async () => {
      renderNew();
      await fillRequiredFields();
      await user.type(
        screen.getByPlaceholderText("https://"),
        "linkedin.com/in/grace",
      );

      await user.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => {
        expect(
          screen.getByText("URL must start with http:// or https://"),
        ).toBeInTheDocument();
      });
      expect(addContactInfo).not.toHaveBeenCalled();
    });
  });
});
