import { AddJob } from "@/components/myjobs/AddJob";
import { JOB_SOURCES } from "@/lib/data/jobSourcesData";
import { JOB_STATUSES } from "@/lib/data/jobStatusesData";
import { getMockList } from "@/lib/mock.utils";
import "@testing-library/jest-dom";
import { screen, render, waitFor } from "@testing-library/react";
import { getCurrentUser } from "@/utils/user.utils";
import userEvent from "@testing-library/user-event";
import { format } from "date-fns";

jest.mock("@/utils/user.utils", () => ({
  getCurrentUser: jest.fn(),
}));

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe("AddCompany Component", () => {
  const mockUser = { id: "user-id" };
  const mockJobStatuses = JOB_STATUSES;
  const mockJobSources = JOB_SOURCES;
  const mockResetEditJob = jest.fn();
  const user = userEvent.setup();
  let container: HTMLElement | null;

  beforeEach(async () => {
    jest.clearAllMocks();
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
  it("should open the dialog when clicked on add job button with title 'Edit Job'", () => {
    // const menuButton = screen.getByTestId("job-actions-menu-btn");
    // user.click(editJobButton);
    // const dialogTitle = screen.getByTestId("add-job-dialog-title");
    // expect(dialogTitle).toBeInTheDocument();
    // expect(dialogTitle).toHaveTextContent("Edit Job");
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
  it("should closes the dialog and submit to save job when clicked on save button", () => {});
  it("should load and show the job title combobox list", () => {});
  it("should load and show the company combobox list", () => {});
  it("should load and show the location combobox list", () => {});
  it("should load and show the job source combobox list", () => {});
  it("should load and show the salary range select list", () => {});
  it("should load and show the status select list", () => {});
});
