import { render, screen } from "@testing-library/react";
import CompanyDetailsPage from "@/app/dashboard/admin/companies/[id]/page";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
}));

const getCompanyDetails = vi.fn();

vi.mock("@/actions/company.actions", () => ({
  getCompanyDetails: (id: string) => getCompanyDetails(id),
}));

vi.mock("@/components/admin/CompanyDetails", () => ({
  default: () => <div data-testid="company-details" />,
}));

describe("CompanyDetailsPage", () => {
  beforeEach(() => {
    notFound.mockClear();
  });

  // A foreign id resolves to null too, so it 404s exactly like a missing one.
  it("renders not found when the company does not resolve for the user", async () => {
    getCompanyDetails.mockResolvedValue(null);

    await expect(
      CompanyDetailsPage({ params: Promise.resolve({ id: "missing" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("renders not found when the fetch failed", async () => {
    getCompanyDetails.mockResolvedValue({ success: false, message: "boom" });

    await expect(
      CompanyDetailsPage({ params: Promise.resolve({ id: "any" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders the details for a company the user owns", async () => {
    getCompanyDetails.mockResolvedValue({ id: "co1", label: "Stripe" });

    render(await CompanyDetailsPage({ params: Promise.resolve({ id: "co1" }) }));

    expect(getCompanyDetails).toHaveBeenCalledWith("co1");
    expect(screen.getByTestId("company-details")).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });
});
