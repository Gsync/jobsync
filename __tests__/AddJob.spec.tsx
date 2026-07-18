import { AddJob } from "@/components/myjobs/AddJob";
import { JOB_SOURCES } from "@/lib/data/jobSourcesData";
import { JOB_STATUSES } from "@/lib/data/jobStatusesData";
import { getMockJobDetails, getMockList } from "@/lib/mock.utils";
import { screen, render, waitFor } from "@testing-library/react";
import { getCurrentUser } from "@/utils/user.utils";
import userEvent from "@testing-library/user-event";
import { format } from "date-fns";
import { addJob, updateJob } from "@/actions/job.actions";
import { toast } from "@/components/ui/use-toast";
import type { JobResponse } from "@/models/job.model";
vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/actions/job.actions", () => ({
  addJob: vi.fn().mockResolvedValue({ success: true }),
  updateJob: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/actions/note.actions", () => ({
  getNotesByJobId: vi.fn().mockResolvedValue({ success: true, data: [] }),
  addNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({ replace: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

document.createRange = () => {
  const range = new Range();

  range.getBoundingClientRect = vi.fn().mockReturnValue({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
  });

  range.getClientRects = () => {
    return {
      item: () => null,
      length: 0,
      [Symbol.iterator]: vi.fn(),
    };
  };

  return range;
};

describe("AddJob Component", () => {
  const mockUser = { id: "user-id" };
  const mockJobStatuses = JOB_STATUSES;
  const mockJobSources = JOB_SOURCES;
  const mockResetEditJob = vi.fn();
  const user = userEvent.setup({ skipHover: true });
  window.HTMLElement.prototype.scrollIntoView = vi.fn(); // Fixes the issue with combobox
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();

  beforeEach(async () => {
    const mockCompanies = (await getMockList(1, 10, "companies")).data;
    const mockJobTitles = (await getMockList(1, 10, "jobTitles")).data;
    const mockLocations = (await getMockList(1, 10, "locations")).data;
    vi.clearAllMocks();
    render(
      <AddJob
        jobStatuses={mockJobStatuses}
        companies={mockCompanies}
        jobTitles={mockJobTitles}
        locations={mockLocations}
        jobSources={mockJobSources}
        tags={[]}
        editJob={null}
        resetEditJob={mockResetEditJob}
      />,
    );
    const addJobButton = screen.getByTestId("add-job-btn");
    await user.click(addJobButton);
  });

  it("should open the dialog when clicked on add job button with title 'Add Job'", async () => {
    (getCurrentUser as any).mockResolvedValue(mockUser);

    const dialogTitle = screen.getByTestId("add-job-dialog-title");
    expect(dialogTitle).toBeInTheDocument();
    expect(dialogTitle).toHaveTextContent("Add Job");
  });
  it("should reflect on status and date applied when applied switch toggles", async () => {
    const appliedSwitch = screen.getByRole("switch");
    expect(appliedSwitch).not.toBeChecked();
    const dateApplied = screen.getByLabelText("Date Applied");
    expect(dateApplied).toBeDisabled();
    await user.click(appliedSwitch); // toggle applied switch
    expect(appliedSwitch).toBeChecked();
    expect(dateApplied).toBeEnabled(); // date applied is enabled
    expect(dateApplied).toHaveTextContent(format(new Date(), "PP")); // to have today's date
    const status = screen.getByLabelText("Status");
    expect(status).toHaveTextContent("Applied");
    await user.click(appliedSwitch);
    expect(status).toHaveTextContent("Draft");
    expect(dateApplied).toBeDisabled();
    expect(dateApplied).toHaveTextContent("Pick a date");
  });
  it("should open the dialog when clicked on add job button with title 'Edit Job'", async () => {
    // TODO: To be tested with job container and jobs table component
  });

  it("should open the dialog immediately when initialOpen is true", async () => {
    const mockCompanies = (await getMockList(1, 10, "companies")).data;
    const mockJobTitles = (await getMockList(1, 10, "jobTitles")).data;
    const mockLocations = (await getMockList(1, 10, "locations")).data;
    render(
      <AddJob
        jobStatuses={mockJobStatuses}
        companies={mockCompanies}
        jobTitles={mockJobTitles}
        locations={mockLocations}
        jobSources={mockJobSources}
        tags={[]}
        editJob={null}
        resetEditJob={mockResetEditJob}
        initialOpen={true}
      />,
    );
    const dialogTitle = screen.getAllByTestId("add-job-dialog-title")[0];
    expect(dialogTitle).toBeInTheDocument();
    expect(dialogTitle).toHaveTextContent("Add Job");
  });
  it("should show relevant react-hook-form errors", async () => {
    const saveBtn = screen.getByTestId("save-job-btn");
    await user.click(saveBtn);
    expect(screen.getByText("Job title is required.")).toBeInTheDocument();
    expect(screen.getByText("Company name is required.")).toBeInTheDocument();
    expect(screen.getByText("Location is required.")).toBeInTheDocument();
    expect(screen.getByText("Source is required.")).toBeInTheDocument();
    expect(
      screen.getByText("Job description is required."),
    ).toBeInTheDocument();
  });
  it("should close the dialog when clicked on cancel button", async () => {
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    const dialog = await screen.findByRole("dialog");
    await user.click(cancelBtn);
    expect(dialog).not.toBeInTheDocument();
  });
  it("should load and show the job title combobox list", async () => {
    const jobTitleCombobox = screen.getByLabelText("Job Title");
    await user.click(jobTitleCombobox);
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
    expect(options[0].textContent).toBe("Frontend Developer");
  });
  it("should load and show the company combobox list", async () => {
    const companyCombobox = screen.getByLabelText("Company");
    await user.click(companyCombobox);
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
    expect(options[0].textContent).toBe("Google");
  });
  it("should load and show the location combobox list", async () => {
    const locationCombobox = screen.getByLabelText("Job Location");
    await user.click(locationCombobox);
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
    expect(options[0].textContent).toBe("San Francisco");
  });
  it("should load and show the job source combobox list", async () => {
    const sourceCombobox = screen.getByLabelText("Job Source");
    await user.click(sourceCombobox);
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
    expect(options[0].textContent).toBe("Indeed");
  });
  it("should load and show the salary range select list", async () => {
    const salaryRangeSelect = screen.getByLabelText("Salary Range");
    await user.click(salaryRangeSelect);
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
    expect(options[0].textContent).toBe("0 - 10,000");
  });
  it("should load and show the status select list", async () => {
    const statusSelect = screen.getByLabelText("Status");
    await user.click(statusSelect);
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
    expect(options[0].textContent).toBe("Draft");
  });
  it("should closes the dialog and submit to save job when clicked on save button", async () => {
    const jobTitleInput = screen.getByRole("combobox", {
      name: /job title/i,
    }) as HTMLSelectElement;
    await user.click(jobTitleInput);
    const selectedJobTitle = screen.getByRole("option", {
      name: "Full Stack Developer",
    });
    await user.click(selectedJobTitle);

    const companyInput = screen.getByRole("combobox", { name: /company/i });
    await user.click(companyInput);
    const selectedCompany = screen.getByRole("option", {
      name: "Amazon",
    });
    await user.click(selectedCompany);

    const locationInput = screen.getByRole("combobox", {
      name: /job location/i,
    });
    await user.click(locationInput);
    const selectedLocation = screen.getByRole("option", {
      name: "Remote",
    });
    await user.click(selectedLocation);

    const sourceInput = screen.getByRole("combobox", {
      name: /job source/i,
    });
    await user.click(sourceInput);
    const selectedSource = screen.getByRole("option", {
      name: "Indeed",
    });
    await user.click(selectedSource);

    const editableDiv = screen.getByLabelText("Job Description");
    const pTag = editableDiv.querySelector("div > p");
    if (pTag) {
      pTag.textContent = "New Job Description";
    }

    const dialog = await screen.findByRole("dialog");
    const saveBtn = screen.getByTestId("save-job-btn");
    await user.click(saveBtn);

    await waitFor(() => {
      expect(addJob).toHaveBeenCalledTimes(1);
      expect(dialog).not.toBeInTheDocument();
      expect(addJob).toHaveBeenCalledWith({
        title: "1xx",
        company: "2zz",
        location: "1yy",
        type: "FT",
        workplaceType: "ONSITE",
        source: "1359dac4-a397-4461-b747-382706dcbe79",
        status: "d7ba200a-6dc1-4ea8-acff-29ebb0d4676a",
        dueDate: expect.any(Date),
        dateApplied: undefined,
        salaryRange: "1",
        jobDescription: "<p>New Job Description</p>",
        jobUrl: undefined,
        applied: false,
        tags: [],
      });
    });
  });
});

describe("AddJob Component - Edit Mode", () => {
  const mockJobStatuses = JOB_STATUSES;
  const mockJobSources = JOB_SOURCES;
  const mockResetEditJob = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();

  const editJob = {
    id: "job-edit-1",
    userId: "user-id",
    JobTitle: { id: "1xx", label: "Full Stack Developer", value: "full stack developer" },
    Company: { id: "2zz", label: "Amazon", value: "amazon", logoUrl: "" },
    Location: { id: "1yy", label: "Remote", value: "remote" },
    JobSource: { id: "1359dac4-a397-4461-b747-382706dcbe79", label: "Indeed", value: "indeed" },
    Status: { id: "5e7c6e8c-83e6-46e3-bf01-db8f0b503399", label: "Applied", value: "applied" },
    jobType: "FT",
    createdAt: new Date("2024-06-01"),
    appliedDate: new Date("2024-06-05"),
    dueDate: new Date("2024-06-20"),
    salaryRange: "2",
    description: "<p>Existing job description</p>",
    jobUrl: "https://example.com/job",
    applied: true,
  } as unknown as JobResponse;

  async function renderEditMode() {
    const mockCompanies = (await getMockList(1, 10, "companies")).data;
    const mockJobTitles = (await getMockList(1, 10, "jobTitles")).data;
    const mockLocations = (await getMockList(1, 10, "locations")).data;
    vi.clearAllMocks();
    return render(
      <AddJob
        jobStatuses={mockJobStatuses}
        companies={mockCompanies}
        jobTitles={mockJobTitles}
        locations={mockLocations}
        jobSources={mockJobSources}
        tags={[]}
        editJob={editJob}
        resetEditJob={mockResetEditJob}
      />,
    );
  }

  it("opens automatically with title 'Edit Job' and pre-fills the form from editJob", async () => {
    await renderEditMode();

    const dialogTitle = screen.getByTestId("add-job-dialog-title");
    expect(dialogTitle).toHaveTextContent("Edit Job");

    expect(screen.getByLabelText("Job Title")).toHaveTextContent(
      "Full Stack Developer",
    );
    expect(screen.getByLabelText("Company")).toHaveTextContent("Amazon");
    expect(screen.getByLabelText("Job Location")).toHaveTextContent("Remote");
    expect(screen.getByLabelText("Job Source")).toHaveTextContent("Indeed");
    expect(screen.getByLabelText("Status")).toHaveTextContent("Applied");
    expect(screen.getByLabelText("Job URL")).toHaveValue(
      "https://example.com/job",
    );

    const appliedSwitch = screen.getByRole("switch");
    expect(appliedSwitch).toBeChecked();
  });

  it("leaves workplace type unselected when editing a job with no workplaceType", async () => {
    await renderEditMode();

    await waitFor(() => {
      expect(screen.getByTestId("add-job-dialog-title")).toHaveTextContent(
        "Edit Job",
      );
    });

    const workplaceRadios = screen
      .getAllByRole("radio")
      .filter((radio) =>
        ["REMOTE", "HYBRID", "ONSITE"].includes(
          radio.getAttribute("value") || "",
        ),
      );
    expect(workplaceRadios).toHaveLength(3);
    workplaceRadios.forEach((radio) => expect(radio).not.toBeChecked());
  });

  it("calls updateJob (not addJob) with the job id when saving an edited job", async () => {
    await renderEditMode();

    await waitFor(() => {
      expect(screen.getByTestId("add-job-dialog-title")).toHaveTextContent(
        "Edit Job",
      );
    });

    const dialog = await screen.findByRole("dialog");
    const saveBtn = screen.getByTestId("save-job-btn");
    const user = userEvent.setup({ skipHover: true });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(updateJob).toHaveBeenCalledTimes(1);
      expect(addJob).not.toHaveBeenCalled();
      expect(dialog).not.toBeInTheDocument();
      expect(updateJob).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "job-edit-1",
          title: "1xx",
          company: "2zz",
          location: "1yy",
          source: "1359dac4-a397-4461-b747-382706dcbe79",
          status: "5e7c6e8c-83e6-46e3-bf01-db8f0b503399",
        }),
      );
    });
  });
});

describe("AddJob Component - Error Handling", () => {
  const mockJobStatuses = JOB_STATUSES;
  const mockJobSources = JOB_SOURCES;
  const mockResetEditJob = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();

  it("shows a destructive toast when addJob fails", async () => {
    const mockCompanies = (await getMockList(1, 10, "companies")).data;
    const mockJobTitles = (await getMockList(1, 10, "jobTitles")).data;
    const mockLocations = (await getMockList(1, 10, "locations")).data;
    vi.clearAllMocks();
    (addJob as any).mockResolvedValueOnce({
      success: false,
      message: "Failed to save job",
    });

    render(
      <AddJob
        jobStatuses={mockJobStatuses}
        companies={mockCompanies}
        jobTitles={mockJobTitles}
        locations={mockLocations}
        jobSources={mockJobSources}
        tags={[]}
        editJob={null}
        resetEditJob={mockResetEditJob}
      />,
    );
    const user = userEvent.setup({ skipHover: true });
    await user.click(screen.getByTestId("add-job-btn"));

    const jobTitleInput = screen.getByRole("combobox", { name: /job title/i });
    await user.click(jobTitleInput);
    await user.click(screen.getByRole("option", { name: "Full Stack Developer" }));

    const companyInput = screen.getByRole("combobox", { name: /company/i });
    await user.click(companyInput);
    await user.click(screen.getByRole("option", { name: "Amazon" }));

    const locationInput = screen.getByRole("combobox", { name: /job location/i });
    await user.click(locationInput);
    await user.click(screen.getByRole("option", { name: "Remote" }));

    const sourceInput = screen.getByRole("combobox", { name: /job source/i });
    await user.click(sourceInput);
    await user.click(screen.getByRole("option", { name: "Indeed" }));

    const editableDiv = screen.getByLabelText("Job Description");
    const pTag = editableDiv.querySelector("div > p");
    if (pTag) {
      pTag.textContent = "Some description";
    }

    await user.click(screen.getByTestId("save-job-btn"));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          title: "Error!",
          description: "Failed to save job",
        }),
      );
    });
  }, 15000);
});
