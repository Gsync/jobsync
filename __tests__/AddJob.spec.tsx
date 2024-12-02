import { AddJob } from "@/components/myjobs/AddJob";
import { JOB_SOURCES } from "@/lib/data/jobSourcesData";
import { JOB_STATUSES } from "@/lib/data/jobStatusesData";
import { getMockJobDetails, getMockList } from "@/lib/mock.utils";
import "@testing-library/jest-dom";
import { screen, render, waitFor } from "@testing-library/react";
import { getCurrentUser } from "@/utils/user.utils";
import userEvent from "@testing-library/user-event";
import { format } from "date-fns";
import { addJob } from "@/actions/job.actions";
jest.mock("@/utils/user.utils", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/actions/job.actions", () => ({
  addJob: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

document.createRange = () => {
  const range = new Range();

  range.getBoundingClientRect = jest.fn().mockReturnValue({
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
      [Symbol.iterator]: jest.fn(),
    };
  };

  return range;
};

describe("AddJob Component", () => {
  const mockUser = { id: "user-id" };
  const mockJobStatuses = JOB_STATUSES;
  const mockJobSources = JOB_SOURCES;
  const mockResetEditJob = jest.fn();
  const user = userEvent.setup({ skipHover: true });
  window.HTMLElement.prototype.scrollIntoView = jest.fn(); // Fixes the issue with combobox
  window.HTMLElement.prototype.hasPointerCapture = jest.fn();

  beforeEach(async () => {
    const mockCompanies = (await getMockList(1, 10, "companies")).data;
    const mockJobTitles = (await getMockList(1, 10, "jobTitles")).data;
    const mockLocations = (await getMockList(1, 10, "locations")).data;
    jest.clearAllMocks();
    render(
      <AddJob
        jobStatuses={mockJobStatuses}
        companies={mockCompanies}
        jobTitles={mockJobTitles}
        locations={mockLocations}
        jobSources={mockJobSources}
        editJob={null}
        resetEditJob={mockResetEditJob}
      />
    );
    const addJobButton = screen.getByTestId("add-job-btn");
    await user.click(addJobButton);
  });

  it("should open the dialog when clicked on add job button with title 'Add Job'", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

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
  it("should show relevant react-hook-form errors", async () => {
    const saveBtn = screen.getByTestId("save-job-btn");
    await user.click(saveBtn);
    expect(screen.getByText("Job title is required.")).toBeInTheDocument();
    expect(screen.getByText("Company name is required.")).toBeInTheDocument();
    expect(screen.getByText("Location is required.")).toBeInTheDocument();
    expect(screen.getByText("Source is required.")).toBeInTheDocument();
    expect(
      screen.getByText("Job description is required.")
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
        source: "1359dac4-a397-4461-b747-382706dcbe79",
        status: "d7ba200a-6dc1-4ea8-acff-29ebb0d4676a",
        dueDate: expect.any(Date),
        dateApplied: undefined,
        salaryRange: "1",
        jobDescription: "<p>New Job Description</p>",
        jobUrl: undefined,
        applied: false,
      });
    });
  });
});
