import "@testing-library/jest-dom";
import { screen, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminTabsContainer from "@/components/admin/AdminTabsContainer";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/dashboard/admin",
  useSearchParams: () => new URLSearchParams(""),
}));

jest.mock("@/actions/company.actions", () => ({
  getCompanyList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
  getCompanyById: jest.fn(),
}));

jest.mock("@/actions/jobtitle.actions", () => ({
  getJobTitleList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
}));

jest.mock("@/actions/jobLocation.actions", () => ({
  getJobLocationsList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
}));

describe("AdminTabsContainer", () => {
  const user = userEvent.setup({ skipHover: true });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render all three tabs", () => {
    render(<AdminTabsContainer />);

    expect(screen.getByRole("tab", { name: "Companies" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Job Titles" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Locations" })
    ).toBeInTheDocument();
  });

  it("should default to companies tab", () => {
    render(<AdminTabsContainer />);

    const companiesTab = screen.getByRole("tab", { name: "Companies" });
    expect(companiesTab).toHaveAttribute("data-state", "active");
  });

  it("should switch tabs and update URL", async () => {
    render(<AdminTabsContainer />);

    const jobTitlesTab = screen.getByRole("tab", { name: "Job Titles" });
    await user.click(jobTitlesTab);

    expect(mockPush).toHaveBeenCalledWith(
      "/dashboard/admin?tab=job-titles"
    );
  });

  it("should switch to locations tab and update URL", async () => {
    render(<AdminTabsContainer />);

    const locationsTab = screen.getByRole("tab", { name: "Locations" });
    await user.click(locationsTab);

    expect(mockPush).toHaveBeenCalledWith(
      "/dashboard/admin?tab=locations"
    );
  });

  it("should render companies tab panel content by default", async () => {
    render(<AdminTabsContainer />);

    await waitFor(() => {
      expect(screen.getByTestId("add-company-btn")).toBeInTheDocument();
    });
  });
});
