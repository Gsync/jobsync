import { JobContactsTab } from "@/components/myjobs/job-details/JobContactsTab";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  getAllContacts,
  getJobContacts,
  removeJobContact,
} from "@/actions/contact.actions";
import { getAllContactRoles } from "@/actions/contactRole.actions";

vi.mock("@/actions/contact.actions", () => ({
  getAllContacts: vi.fn(),
  getJobContacts: vi.fn(),
  addJobContact: vi.fn(),
  removeJobContact: vi.fn(),
  createContact: vi.fn(),
  updateContact: vi.fn(),
}));

vi.mock("@/actions/contactRole.actions", () => ({
  getAllContactRoles: vi.fn(),
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
  toastActionResult: vi.fn((res, opts) => res?.success && opts?.onSuccess?.()),
}));

const link = {
  id: "jc1",
  jobId: "j1",
  contactId: "c1",
  roleId: "r1",
  createdAt: new Date(),
  Role: { id: "r1", label: "Recruiter", value: "recruiter", createdBy: "u1" },
  Contact: {
    id: "c1",
    name: "Sarah Cole",
    title: "Talent Partner",
    email: "sarah@x.com",
    phone: null,
    linkedinUrl: null,
    Company: { id: "co1", label: "Vercel" },
  },
};

describe("JobContactsTab", () => {
  const user = userEvent.setup({ skipHover: true });

  beforeEach(() => {
    vi.clearAllMocks();
    (getAllContacts as any).mockResolvedValue([
      { id: "c2", label: "Priya Nair", value: "priya nair" },
    ]);
    (getAllContactRoles as any).mockResolvedValue([
      { id: "r1", label: "Recruiter", value: "recruiter", createdBy: "u1" },
    ]);
    (getJobContacts as any).mockResolvedValue([link]);
  });

  it("lists the linked contacts with their role", () => {
    render(<JobContactsTab jobId="j1" links={[link] as any} />);
    expect(screen.getByText("Sarah Cole")).toBeInTheDocument();
    expect(screen.getByText("Recruiter")).toBeInTheDocument();
  });

  it("shows an empty state with no links", () => {
    render(<JobContactsTab jobId="j1" links={[]} />);
    expect(screen.getByText(/no contacts on this job/i)).toBeInTheDocument();
  });

  it("does not fetch the picker lists until the add form is opened", () => {
    render(<JobContactsTab jobId="j1" links={[link] as any} />);
    expect(getAllContacts).not.toHaveBeenCalled();
    expect(getAllContactRoles).not.toHaveBeenCalled();
  });

  it("fetches contacts and roles on first open of the add form", async () => {
    render(<JobContactsTab jobId="j1" links={[link] as any} />);
    await user.click(screen.getByRole("button", { name: /add contact/i }));

    await waitFor(() => expect(getAllContacts).toHaveBeenCalledTimes(1));
    expect(getAllContactRoles).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    await user.click(screen.getByRole("button", { name: /add contact/i }));

    expect(getAllContacts).toHaveBeenCalledTimes(1);
  });

  it("unlinks a contact and refreshes the list", async () => {
    (removeJobContact as any).mockResolvedValue({ success: true });
    (getJobContacts as any).mockResolvedValue([]);

    render(<JobContactsTab jobId="j1" links={[link] as any} />);
    await user.click(screen.getByRole("button", { name: /remove sarah cole/i }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() => expect(removeJobContact).toHaveBeenCalledWith("jc1"));
    await waitFor(() => expect(getJobContacts).toHaveBeenCalledWith("j1"));
  });
});
