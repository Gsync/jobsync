import CompanyDetails from "@/components/admin/CompanyDetails";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  deleteCompanyById,
  setCompanyWatched,
} from "@/actions/company.actions";
import { toastError } from "@/lib/toast";

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() };
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
  usePathname: () => "/dashboard/admin/companies/co1",
}));

vi.mock("@/actions/company.actions", () => ({
  deleteCompanyById: vi.fn(),
  setCompanyWatched: vi.fn(),
  addCompany: vi.fn(),
  updateCompany: vi.fn(),
  getAllCompanies: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastActionResult: vi.fn(),
}));

vi.mock("@/components/CircularScore", () => ({
  CircularScore: ({ score }: { score: number }) => (
    <div data-testid="circular-score">{score}%</div>
  ),
}));

const makeDetails = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "co1",
    label: "Stripe",
    value: "stripe",
    createdBy: "u1",
    watched: false,
    watchedAt: null,
    atsProvider: null,
    atsToken: null,
    atsHost: null,
    websiteUrl: null,
    careersUrl: null,
    industry: null,
    jobs: [],
    appliedCount: 0,
    dismissedJobsCount: 0,
    currentContacts: [],
    formerContacts: [],
    ...overrides,
  }) as any;

const fact = (label: string) =>
  within(screen.getByTestId("company-summary")).getByText(label)
    .nextElementSibling as HTMLElement;

describe("CompanyDetails – header", () => {
  const user = userEvent.setup({ skipHover: true });

  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
  });

  it("shows the company name with its industry and website host", () => {
    render(
      <CompanyDetails
        details={makeDetails({
          industry: "Payments",
          websiteUrl: "https://stripe.com/about",
        })}
      />,
    );

    expect(screen.getByRole("heading", { name: "Stripe" })).toBeInTheDocument();
    expect(screen.getByText("Payments · stripe.com")).toBeInTheDocument();
  });

  it("drops the subtitle line when there is neither industry nor website", () => {
    render(<CompanyDetails details={makeDetails()} />);

    expect(screen.getByRole("heading", { name: "Stripe" }).nextElementSibling).toBeNull();
  });

  it("goes back to the Library companies tab", () => {
    render(<CompanyDetails details={makeDetails()} />);

    expect(
      screen.getByRole("link", { name: /back to companies/i }),
    ).toHaveAttribute("href", "/dashboard/admin?tab=companies");
  });

  it("returns to the watchlist scope it was opened from", () => {
    searchParams = new URLSearchParams("scope=watchlist");
    render(<CompanyDetails details={makeDetails()} />);

    expect(
      screen.getByRole("link", { name: /back to companies/i }),
    ).toHaveAttribute("href", "/dashboard/admin?tab=companies&scope=watchlist");
  });

  it("watches the company and refreshes the page", async () => {
    (setCompanyWatched as any).mockResolvedValue({ success: true });
    render(<CompanyDetails details={makeDetails()} />);

    await user.click(screen.getByRole("button", { name: /^watch$/i }));

    expect(setCompanyWatched).toHaveBeenCalledWith("co1", true);
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
  });

  it("offers Unwatch for a watched company", () => {
    render(<CompanyDetails details={makeDetails({ watched: true })} />);

    expect(screen.getByRole("button", { name: /unwatch/i })).toBeInTheDocument();
  });

  it("opens the edit dialog", async () => {
    render(<CompanyDetails details={makeDetails()} />);

    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    expect(
      await screen.findByRole("heading", { name: "Edit Company" }),
    ).toBeInTheDocument();
  });

  it("reopens Edit with the saved values after an abandoned change", async () => {
    render(<CompanyDetails details={makeDetails({ industry: "Payments" })} />);

    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    const industry = await screen.findByLabelText("Industry");
    await user.clear(industry);
    await user.type(industry, "Half typed");
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    expect(await screen.findByLabelText("Industry")).toHaveValue("Payments");
  });

  it("lists only the external links the company has", async () => {
    render(
      <CompanyDetails
        details={makeDetails({ websiteUrl: "https://stripe.com" })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /more links/i }));

    expect(
      screen.getByRole("menuitem", { name: /open website/i }),
    ).toHaveAttribute("href", "https://stripe.com");
    expect(
      screen.queryByRole("menuitem", { name: /open careers page/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /open job board/i }),
    ).not.toBeInTheDocument();
  });

  it("builds the job board link from the board coordinates", async () => {
    render(
      <CompanyDetails
        details={makeDetails({ atsProvider: "greenhouse", atsToken: "stripe" })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /more links/i }));

    expect(
      screen.getByRole("menuitem", { name: /open job board/i }).getAttribute("href"),
    ).toMatch(/\/stripe$/);
  });

  it("hides the links menu when there is nothing to open", () => {
    render(<CompanyDetails details={makeDetails()} />);

    expect(
      screen.queryByRole("button", { name: /more links/i }),
    ).not.toBeInTheDocument();
  });
});

describe("CompanyDetails – summary card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
  });

  it("shows the watch state", () => {
    render(
      <CompanyDetails
        details={makeDetails({ watched: true, watchedAt: new Date() })}
      />,
    );

    expect(fact("Watchlist")).toHaveTextContent(/^Watched/);
  });

  it("shows Not watched and em dashes for missing attributes", () => {
    render(<CompanyDetails details={makeDetails()} />);

    expect(fact("Watchlist")).toHaveTextContent("Not watched");
    expect(fact("Board")).toHaveTextContent("—");
    expect(fact("Industry")).toHaveTextContent("—");
    expect(fact("Website")).toHaveTextContent("—");
    expect(fact("Careers page")).toHaveTextContent("—");
  });

  it("counts jobs, applied jobs and distinct contacts", () => {
    const dave = { id: "c1", name: "Dave Patel", _count: { jobLinks: 0 } };
    const priya = { id: "c2", name: "Priya Nair", _count: { jobLinks: 0 } };
    render(
      <CompanyDetails
        details={makeDetails({
          jobs: [
            { id: "j1", applied: true, JobTitle: { label: "A" }, Status: { label: "Applied", value: "applied" }, Location: null, JobSource: null, appliedDate: null, matchScore: null, createdAt: new Date() },
            { id: "j2", applied: false, JobTitle: { label: "B" }, Status: { label: "Draft", value: "draft" }, Location: null, JobSource: null, appliedDate: null, matchScore: null, createdAt: new Date() },
          ],
          appliedCount: 1,
          currentContacts: [dave, priya],
          formerContacts: [dave],
        })}
      />,
    );

    expect(fact("Jobs")).toHaveTextContent("2");
    expect(fact("Applied")).toHaveTextContent("1");
    expect(fact("Contacts")).toHaveTextContent("2");
  });
});

describe("CompanyDetails – delete", () => {
  const user = userEvent.setup({ skipHover: true });

  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
  });

  const job = {
    id: "j1",
    applied: false,
    appliedDate: null,
    matchScore: null,
    createdAt: new Date(),
    JobTitle: { label: "Backend Engineer" },
    Status: { label: "Draft", value: "draft" },
    Location: null,
    JobSource: null,
  };

  it("explains instead of confirming when the company has jobs", async () => {
    render(<CompanyDetails details={makeDetails({ jobs: [job] })} />);

    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(await screen.findByText("Associated jobs exist!")).toBeInTheDocument();
    expect(deleteCompanyById).not.toHaveBeenCalled();
  });

  it("still blocks when every job was dismissed, and says so", async () => {
    render(<CompanyDetails details={makeDetails({ dismissedJobsCount: 3 })} />);

    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(await screen.findByText("Associated jobs exist!")).toBeInTheDocument();
    expect(screen.getByText(/3 of them were dismissed by automations/)).toBeInTheDocument();
  });

  it("deletes a company with no jobs and returns to the Library", async () => {
    (deleteCompanyById as any).mockResolvedValue({ success: true });
    searchParams = new URLSearchParams("scope=watchlist");
    render(<CompanyDetails details={makeDetails()} />);

    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /delete/i }));

    await waitFor(() => expect(deleteCompanyById).toHaveBeenCalledWith("co1"));
    expect(router.push).toHaveBeenCalledWith(
      "/dashboard/admin?tab=companies&scope=watchlist",
    );
  });

  it("surfaces the server's reason when the delete is refused", async () => {
    (deleteCompanyById as any).mockResolvedValue({
      success: false,
      message: "Company cannot be deleted due to 2 associated contacts! ",
    });
    render(<CompanyDetails details={makeDetails()} />);

    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /delete/i }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Company cannot be deleted due to 2 associated contacts! ",
      ),
    );
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("CompanyDetails – Jobs tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
  });

  const job = (overrides: Record<string, unknown> = {}) => ({
    id: "j1",
    createdAt: new Date("2026-09-01"),
    applied: true,
    appliedDate: new Date("2026-09-02"),
    matchScore: 82,
    JobTitle: { label: "Backend Engineer" },
    Status: { label: "Applied", value: "applied" },
    Location: { label: "Remote" },
    JobSource: { label: "LinkedIn" },
    ...overrides,
  });

  it("opens on the Jobs tab with a count badge", () => {
    render(<CompanyDetails details={makeDetails({ jobs: [job(), job({ id: "j2" })] })} />);

    const tab = screen.getByRole("tab", { name: /jobs/i });
    expect(tab).toHaveAttribute("data-state", "active");
    expect(tab).toHaveTextContent("2");
  });

  it("links each job title to the job's details page", () => {
    render(<CompanyDetails details={makeDetails({ jobs: [job()] })} />);

    expect(
      screen.getByRole("link", { name: "Backend Engineer" }),
    ).toHaveAttribute("href", "/dashboard/myjobs/j1");
  });

  it("shows status, location, source and the match score", () => {
    render(<CompanyDetails details={makeDetails({ jobs: [job()] })} />);

    const row = screen.getByRole("row", { name: /backend engineer/i });
    expect(within(row).getByText("Applied")).toBeInTheDocument();
    expect(within(row).getByText("Remote")).toBeInTheDocument();
    expect(within(row).getByText("LinkedIn")).toBeInTheDocument();
    expect(within(row).getByTestId("circular-score")).toHaveTextContent("82%");
  });

  it("shows Not applied and a dash for an unapplied, unmatched job", () => {
    render(
      <CompanyDetails
        details={makeDetails({
          jobs: [job({ appliedDate: null, matchScore: null, JobSource: null })],
        })}
      />,
    );

    const row = screen.getByRole("row", { name: /backend engineer/i });
    expect(within(row).getByText("Not applied")).toBeInTheDocument();
    expect(within(row).queryByTestId("circular-score")).not.toBeInTheDocument();
  });

  it("shows an empty state with no action when there are no jobs", () => {
    render(<CompanyDetails details={makeDetails()} />);

    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("No jobs at this company yet")).toBeInTheDocument();
    expect(within(panel).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /jobs/i })).toHaveTextContent(/^Jobs$/);
  });
});
