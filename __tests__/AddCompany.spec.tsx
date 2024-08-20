import { addCompany, updateCompany } from "@/actions/company.actions";
import AddCompany from "@/components/admin/AddCompany";
import "@testing-library/jest-dom";
import { screen, render, waitFor, fireEvent } from "@testing-library/react";

jest.mock("@/actions/company.actions", () => ({
  addCompany: jest.fn(),
  updateCompany: jest.fn(),
}));

describe("AddCompany Component", () => {
  const mockReloadCompanies = jest.fn();
  const mockResetEditCompany = jest.fn();
  const mockSetDialogOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render Add Company button", async () => {
    render(
      <AddCompany
        reloadCompanies={mockReloadCompanies}
        resetEditCompany={mockResetEditCompany}
        dialogOpen={false}
        setDialogOpen={mockSetDialogOpen}
      />
    );
    expect(
      screen.getByRole("button", { name: /add company/i })
    ).toBeInTheDocument();
  });

  it("should open dialog when Add Company button is clicked", async () => {
    render(
      <AddCompany
        reloadCompanies={mockReloadCompanies}
        resetEditCompany={mockResetEditCompany}
        dialogOpen={false}
        setDialogOpen={mockSetDialogOpen}
      />
    );
    const addCompanyButton = screen.getByRole("button", {
      name: /add company/i,
    });
    fireEvent.click(addCompanyButton);

    expect(mockSetDialogOpen).toHaveBeenCalledWith(true);
  });

  it("should populate form fields when editing a company", async () => {
    const mockEditCompany = {
      id: "company-id",
      label: "Test Company",
      value: "test company",
      createdBy: "user-id",
      logoUrl: "http://example.com/logo.png",
    };

    render(
      <AddCompany
        reloadCompanies={mockReloadCompanies}
        resetEditCompany={mockResetEditCompany}
        editCompany={mockEditCompany}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    const addCompanyButton = await screen.findByTestId("add-company-btn");
    fireEvent.click(addCompanyButton);

    const dialog = await screen.findByText(/edit company/i);
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText(/company name/i)).toHaveValue("Test Company");
    expect(screen.getByLabelText(/company logo url/i)).toHaveValue(
      "http://example.com/logo.png"
    );
  });

  it("should call addCompany function when submitting the form for new company", async () => {
    render(
      <AddCompany
        reloadCompanies={mockReloadCompanies}
        resetEditCompany={mockResetEditCompany}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    const addCompanyButton = await screen.findByTestId("add-company-btn");
    fireEvent.click(addCompanyButton);

    const companyNameInput = screen.getByLabelText(/company name/i);
    fireEvent.change(companyNameInput, {
      target: { value: "New Test Company" },
    });
    const companyLogoUrlInput = screen.getByLabelText(/company logo url/i);
    fireEvent.change(companyLogoUrlInput, {
      target: { value: "http://example.com/new-logo.png" },
    });
    const saveButton = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(addCompany).toHaveBeenCalledTimes(1);
      expect(addCompany).toHaveBeenCalledWith({
        company: "New Test Company",
        logoUrl: "http://example.com/new-logo.png",
      });
    });
  });

  it("should call updateCompany function when submitting the form for editing existing company", async () => {
    const mockEditCompany = {
      id: "company-id",
      label: "Test Company",
      value: "test-company",
      createdBy: "user-id",
      logoUrl: "http://example.com/logo.png",
    };

    render(
      <AddCompany
        reloadCompanies={mockReloadCompanies}
        resetEditCompany={mockResetEditCompany}
        editCompany={mockEditCompany}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    const addCompanyButton = await screen.findByTestId("add-company-btn");

    fireEvent.click(addCompanyButton);

    const companyNameInput = screen.getByLabelText(/company name/i);
    fireEvent.change(companyNameInput, {
      target: { value: "Edited Test Company" },
    });

    const companyLogoUrlInput = screen.getByLabelText(/company logo url/i);
    fireEvent.change(companyLogoUrlInput, {
      target: { value: "http://example.com/edited-logo.png" },
    });

    const saveButton = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateCompany).toHaveBeenCalledTimes(1);
      expect(updateCompany).toHaveBeenCalledWith({
        company: "Edited Test Company",
        logoUrl: "http://example.com/edited-logo.png",
      });
    });
  });
});
