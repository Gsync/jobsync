import ContactsContainer from "@/components/admin/ContactsContainer";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getContactList, deleteContactById } from "@/actions/contact.actions";

vi.mock("@/actions/contact.actions", () => ({
  getContactList: vi.fn(),
  deleteContactById: vi.fn(),
  createContact: vi.fn(),
  updateContact: vi.fn(),
  getContactById: vi.fn(),
}));

vi.mock("@/actions/contactRole.actions", () => ({
  getAllContactRoles: vi.fn().mockResolvedValue([
    { id: "r1", label: "Recruiter", value: "recruiter", createdBy: "u1" },
  ]),
  createContactRole: vi.fn(),
}));

vi.mock("@/actions/company.actions", () => ({
  getAllCompanies: vi.fn().mockResolvedValue([]),
  addCompany: vi.fn(),
}));

vi.mock("@/actions/jobLocation.actions", () => ({
  getAllJobLocations: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastActionResult: vi.fn(),
}));

let intersectionCallback: IntersectionObserverCallback | undefined;
global.IntersectionObserver = class {
  constructor(cb: IntersectionObserverCallback) { intersectionCallback = cb; }
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

const contacts = [
  {
    id: "c1",
    name: "Dave Patel",
    title: "Engineering Manager",
    email: "dave@shopify.com",
    phone: null,
    linkedinUrl: null,
    companyId: "co1",
    Company: { id: "co1", label: "Shopify" },
    locationId: null,
    Location: null,
    relationship: "my manager",
    workedAtCompanyId: "co1",
    WorkedAtCompany: { id: "co1", label: "Shopify" },
    roleId: null,
    Role: null,
    workedFrom: new Date("2019-01-01"),
    workedTo: new Date("2021-06-01"),
    notes: "Happy to be a reference.",
    lastContactedAt: new Date("2026-08-01"),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "u1",
    jobLinks: [
      {
        id: "jc1",
        jobId: "j1",
        contactId: "c1",
        roleId: "r1",
        createdAt: new Date(),
        Role: { id: "r1", label: "Reference", value: "reference", createdBy: "u1" },
        Job: { id: "j1", JobTitle: { label: "Staff Engineer" }, Company: { label: "Datadog" } },
      },
    ],
    _count: { jobLinks: 1 },
  },
];

// The established shim for driving Radix Select in jsdom — see TaskForm.spec.
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
});

describe("ContactsContainer", () => {
  const user = userEvent.setup({ skipHover: true });

  beforeEach(() => {
    vi.clearAllMocks();
    (getContactList as any).mockResolvedValue({ data: contacts, total: 1 });
  });

  it("renders the six summary columns", async () => {
    render(<ContactsContainer />);
    await waitFor(() => expect(screen.getByText("Dave Patel")).toBeInTheDocument());
    expect(screen.getByText("Engineering Manager")).toBeInTheDocument();
    expect(screen.getByText("Shopify")).toBeInTheDocument();
    expect(screen.getByText("Reference")).toBeInTheDocument();
  });

  it("keeps the rest of the record in the expanded row until it is opened", async () => {
    render(<ContactsContainer />);
    await waitFor(() => expect(screen.getByText("Dave Patel")).toBeInTheDocument());

    expect(screen.queryByText("dave@shopify.com")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /expand dave patel/i }));

    expect(await screen.findByText("dave@shopify.com")).toBeInTheDocument();
    expect(screen.getByText(/Happy to be a reference/)).toBeInTheDocument();
    expect(screen.getByText(/Staff Engineer/)).toBeInTheDocument();
  });

  it("refetches with the selected role when the filter changes", async () => {
    render(<ContactsContainer />);
    await waitFor(() => expect(getContactList).toHaveBeenCalled());

    await user.click(screen.getByRole("combobox", { name: /filter by role/i }));
    await user.click(await screen.findByText("Recruiter"));

    await waitFor(() =>
      expect(getContactList).toHaveBeenLastCalledWith(1, expect.any(Number), undefined, "r1"),
    );
  });

  it("names the linked-job count in the delete confirmation", async () => {
    render(<ContactsContainer />);
    await waitFor(() => expect(screen.getByText("Dave Patel")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /toggle menu/i }));
    await user.click(await screen.findByText("Delete"));

    expect(await screen.findByText(/1 job/i)).toBeInTheDocument();
    expect(deleteContactById).not.toHaveBeenCalled();
  });
});
