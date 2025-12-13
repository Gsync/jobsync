import AddExperience from "@/components/profile/AddExperience";
import { addExperience, updateExperience } from "@/actions/profile.actions";
import { getAllCompanies } from "@/actions/company.actions";
import { getAllJobTitles } from "@/actions/jobtitle.actions";
import { getAllJobLocations } from "@/actions/jobLocation.actions";
import "@testing-library/jest-dom";
import { screen, render, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResumeSection } from "@/models/profile.model";

jest.mock("@/actions/profile.actions", () => ({
  addExperience: jest.fn(),
  updateExperience: jest.fn(),
}));

jest.mock("@/actions/company.actions", () => ({
  getAllCompanies: jest.fn(),
}));

jest.mock("@/actions/jobtitle.actions", () => ({
  getAllJobTitles: jest.fn(),
}));

jest.mock("@/actions/jobLocation.actions", () => ({
  getAllJobLocations: jest.fn(),
}));

// Mock TiptapEditor component
jest.mock("@/components/TiptapEditor", () => {
  return function TiptapEditor({ field }: any) {
    return (
      <textarea
        data-testid="tiptap-editor"
        value={field.value || ""}
        onChange={(e) => field.onChange(e.target.value)}
        placeholder="Enter job description"
      />
    );
  };
});

// Mock Combobox component
jest.mock("@/components/ComboBox", () => ({
  Combobox: ({ field, options }: any) => {
    return (
      <select
        data-testid={`combobox-${field.name}`}
        value={field.value || ""}
        onChange={(e) => field.onChange(e.target.value)}
      >
        <option value="">Select...</option>
        {options?.map((option: any) => (
          <option key={option.id} value={option.id}>
            {option.label || option.value}
          </option>
        ))}
      </select>
    );
  },
}));

// Mock DatePicker component
jest.mock("@/components/DatePicker", () => ({
  DatePicker: ({ field, isEnabled }: any) => {
    return (
      <input
        data-testid={`datepicker-${field.name}`}
        type="date"
        value={
          field.value ? new Date(field.value).toISOString().split("T")[0] : ""
        }
        onChange={(e) =>
          field.onChange(e.target.value ? new Date(e.target.value) : undefined)
        }
        disabled={!isEnabled}
      />
    );
  },
}));

// Mock toast
jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

describe("AddExperience Component", () => {
  const mockSetDialogOpen = jest.fn();
  const mockResumeId = "resume-123";
  const mockSectionId = "section-123";
  const user = userEvent.setup();

  const mockCompanies = [
    { id: "company-1", label: "Tech Corp", value: "tech-corp" },
    { id: "company-2", label: "Startup Inc", value: "startup-inc" },
  ];

  const mockJobTitles = [
    { id: "title-1", label: "Software Engineer", value: "software-engineer" },
    { id: "title-2", label: "Senior Developer", value: "senior-developer" },
  ];

  const mockLocations = [
    { id: "location-1", label: "New York, NY", value: "new-york-ny" },
    { id: "location-2", label: "San Francisco, CA", value: "san-francisco-ca" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getAllCompanies as jest.Mock).mockResolvedValue(mockCompanies);
    (getAllJobTitles as jest.Mock).mockResolvedValue(mockJobTitles);
    (getAllJobLocations as jest.Mock).mockResolvedValue(mockLocations);
  });

  it("should render Add Experience dialog with correct title", async () => {
    render(
      <AddExperience
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Add Experience")).toBeInTheDocument();
    });
  });

  it("should render Edit Experience dialog when experienceToEdit is provided", async () => {
    const mockExperienceToEdit: ResumeSection = {
      id: "section-1",
      resumeId: mockResumeId,
      sectionTitle: "Work Experience",
      sectionType: "experience" as any,
      workExperiences: [
        {
          id: "exp-1",
          Company: mockCompanies[0] as any,
          jobTitle: mockJobTitles[0] as any,
          location: mockLocations[0] as any,
          startDate: new Date("2020-01-01"),
          endDate: new Date("2022-12-31"),
          currentJob: false,
          description: "Worked on various projects",
        },
      ],
    };

    render(
      <AddExperience
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
        experienceToEdit={mockExperienceToEdit}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Edit Experience")).toBeInTheDocument();
    });
  });

  it("should render section title field when sectionId is not provided", async () => {
    render(
      <AddExperience
        resumeId={mockResumeId}
        sectionId={undefined}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/section title/i)).toBeInTheDocument();
    });
  });

  it("should not render section title field when sectionId is provided", async () => {
    render(
      <AddExperience
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    await waitFor(() => {
      expect(screen.queryByLabelText(/section title/i)).not.toBeInTheDocument();
    });
  });

  it("should render all form fields correctly", async () => {
    render(
      <AddExperience
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/job title/i)).toBeInTheDocument();
      expect(screen.getByTestId("combobox-title")).toBeInTheDocument();
      expect(screen.getByText(/company/i)).toBeInTheDocument();
      expect(screen.getByTestId("combobox-company")).toBeInTheDocument();
      expect(screen.getByText(/job location/i)).toBeInTheDocument();
      expect(screen.getByTestId("combobox-location")).toBeInTheDocument();
      expect(screen.getByText(/start date/i)).toBeInTheDocument();
      expect(screen.getByTestId("datepicker-startDate")).toBeInTheDocument();
      expect(screen.getByText(/end date/i)).toBeInTheDocument();
      expect(screen.getByTestId("datepicker-endDate")).toBeInTheDocument();
      expect(screen.getByText(/job description/i)).toBeInTheDocument();
      expect(screen.getByTestId("tiptap-editor")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /cancel/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    });
  });

  it("should populate form fields when editing an experience", async () => {
    const mockExperienceToEdit: ResumeSection = {
      id: "section-1",
      resumeId: mockResumeId,
      sectionTitle: "Work Experience",
      sectionType: "experience" as any,
      workExperiences: [
        {
          id: "exp-1",
          Company: mockCompanies[0] as any,
          jobTitle: mockJobTitles[0] as any,
          location: mockLocations[0] as any,
          startDate: new Date("2020-01-01"),
          endDate: new Date("2022-12-31"),
          currentJob: false,
          description: "Worked on various projects",
        },
      ],
    };

    render(
      <AddExperience
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
        experienceToEdit={mockExperienceToEdit}
      />
    );

    await waitFor(() => {
      const jobTitleSelect = screen.getByTestId(
        "combobox-title"
      ) as HTMLSelectElement;
      const companySelect = screen.getByTestId(
        "combobox-company"
      ) as HTMLSelectElement;
      const locationSelect = screen.getByTestId(
        "combobox-location"
      ) as HTMLSelectElement;

      expect(jobTitleSelect.value).toBe("title-1");
      expect(companySelect.value).toBe("company-1");
      expect(locationSelect.value).toBe("location-1");
    });
  });

  it("should close dialog when Cancel button is clicked", async () => {
    render(
      <AddExperience
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /cancel/i })
      ).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockSetDialogOpen).toHaveBeenCalledWith(false);
  });

  it("should disable Save button when form is not dirty", async () => {
    render(
      <AddExperience
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).toBeDisabled();
    });
  });

  it("should disable end date when current job is checked", async () => {
    render(
      <AddExperience
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });

    const currentJobSwitch = screen.getByRole("switch");
    const endDateInput = screen.getByTestId(
      "datepicker-endDate"
    ) as HTMLInputElement;

    expect(endDateInput).not.toBeDisabled();

    await user.click(currentJobSwitch);

    await waitFor(() => {
      expect(endDateInput).toBeDisabled();
    });
  });

  it("should toggle current job label text", async () => {
    render(
      <AddExperience
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/job ended/i)).toBeInTheDocument();
    });

    const currentJobSwitch = screen.getByRole("switch");
    await user.click(currentJobSwitch);

    await waitFor(() => {
      expect(screen.getByText(/current job/i)).toBeInTheDocument();
    });
  });

  it("should call addExperience when submitting a new experience", async () => {
    (addExperience as jest.Mock).mockResolvedValue({
      success: true,
      message: "Experience added successfully",
    });

    render(
      <AddExperience
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    // Wait for options to be loaded and rendered in the select elements
    await waitFor(() => {
      const jobTitleSelect = screen.getByTestId(
        "combobox-title"
      ) as HTMLSelectElement;
      expect(jobTitleSelect.options.length).toBeGreaterThan(1);
    });

    const jobTitleSelect = screen.getByTestId(
      "combobox-title"
    ) as HTMLSelectElement;
    const companySelect = screen.getByTestId(
      "combobox-company"
    ) as HTMLSelectElement;
    const locationSelect = screen.getByTestId(
      "combobox-location"
    ) as HTMLSelectElement;
    const startDateInput = screen.getByTestId(
      "datepicker-startDate"
    ) as HTMLInputElement;
    const jobDescriptionEditor = screen.getByTestId(
      "tiptap-editor"
    ) as HTMLTextAreaElement;

    await user.selectOptions(jobTitleSelect, "title-1");
    await user.selectOptions(companySelect, "company-1");
    await user.selectOptions(locationSelect, "location-1");
    await user.type(startDateInput, "2023-01-01");
    await user.type(jobDescriptionEditor, "Developed amazing features");

    // Wait for form to be valid
    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).not.toBeDisabled();
    });

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(addExperience).toHaveBeenCalledTimes(1);
      expect(addExperience).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "title-1",
          company: "company-1",
          location: "location-1",
          jobDescription: "Developed amazing features",
        })
      );
    });
  });

  it("should call updateExperience when editing an existing experience", async () => {
    const mockExperienceToEdit: ResumeSection = {
      id: "section-1",
      resumeId: mockResumeId,
      sectionTitle: "Work Experience",
      sectionType: "experience" as any,
      workExperiences: [
        {
          id: "exp-1",
          Company: mockCompanies[0] as any,
          jobTitle: mockJobTitles[0] as any,
          location: mockLocations[0] as any,
          startDate: new Date("2020-01-01"),
          endDate: new Date("2022-12-31"),
          currentJob: false,
          description: "Worked on various projects",
        },
      ],
    };

    (updateExperience as jest.Mock).mockResolvedValue({
      success: true,
      message: "Experience updated successfully",
    });

    render(
      <AddExperience
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
        experienceToEdit={mockExperienceToEdit}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("combobox-title")).toBeInTheDocument();
    });

    const jobTitleSelect = screen.getByTestId(
      "combobox-title"
    ) as HTMLSelectElement;
    await user.selectOptions(jobTitleSelect, "title-2");

    // Wait for form to be dirty and valid
    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).not.toBeDisabled();
    });

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(updateExperience).toHaveBeenCalledTimes(1);
      expect(updateExperience).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "exp-1",
          title: "title-2",
        })
      );
    });
  });

  it("should close dialog and show success toast on successful submission", async () => {
    const { toast } = require("@/components/ui/use-toast");

    (addExperience as jest.Mock).mockResolvedValue({
      success: true,
      message: "Experience added successfully",
    });

    render(
      <AddExperience
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("combobox-title")).toBeInTheDocument();
    });

    const jobTitleSelect = screen.getByTestId(
      "combobox-title"
    ) as HTMLSelectElement;
    const companySelect = screen.getByTestId(
      "combobox-company"
    ) as HTMLSelectElement;
    const locationSelect = screen.getByTestId(
      "combobox-location"
    ) as HTMLSelectElement;
    const startDateInput = screen.getByTestId(
      "datepicker-startDate"
    ) as HTMLInputElement;
    const jobDescriptionEditor = screen.getByTestId(
      "tiptap-editor"
    ) as HTMLTextAreaElement;

    await user.selectOptions(jobTitleSelect, "title-1");
    await user.selectOptions(companySelect, "company-1");
    await user.selectOptions(locationSelect, "location-1");
    await user.type(startDateInput, "2023-01-01");
    await user.type(jobDescriptionEditor, "Developed amazing features");

    // Wait for form to be valid
    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).not.toBeDisabled();
    });

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockSetDialogOpen).toHaveBeenCalledWith(false);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "success",
          description: "Experience has been added successfully",
        })
      );
    });
  });

  it("should show error toast on failed submission", async () => {
    const { toast } = require("@/components/ui/use-toast");

    (addExperience as jest.Mock).mockResolvedValue({
      success: false,
      message: "Failed to add experience",
    });

    render(
      <AddExperience
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("combobox-title")).toBeInTheDocument();
    });

    const jobTitleSelect = screen.getByTestId(
      "combobox-title"
    ) as HTMLSelectElement;
    const companySelect = screen.getByTestId(
      "combobox-company"
    ) as HTMLSelectElement;
    const locationSelect = screen.getByTestId(
      "combobox-location"
    ) as HTMLSelectElement;
    const startDateInput = screen.getByTestId(
      "datepicker-startDate"
    ) as HTMLInputElement;
    const jobDescriptionEditor = screen.getByTestId(
      "tiptap-editor"
    ) as HTMLTextAreaElement;

    await user.selectOptions(jobTitleSelect, "title-1");
    await user.selectOptions(companySelect, "company-1");
    await user.selectOptions(locationSelect, "location-1");
    await user.type(startDateInput, "2023-01-01");
    await user.type(jobDescriptionEditor, "Developed amazing features");

    // Wait for form to be valid
    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).not.toBeDisabled();
    });

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          title: "Error!",
          description: "Failed to add experience",
        })
      );
      expect(mockSetDialogOpen).not.toHaveBeenCalledWith(false);
    });
  });

  it("should show updated success message when editing", async () => {
    const { toast } = require("@/components/ui/use-toast");

    const mockExperienceToEdit: ResumeSection = {
      id: "section-1",
      resumeId: mockResumeId,
      sectionTitle: "Work Experience",
      sectionType: "experience" as any,
      workExperiences: [
        {
          id: "exp-1",
          Company: mockCompanies[0] as any,
          jobTitle: mockJobTitles[0] as any,
          location: mockLocations[0] as any,
          startDate: new Date("2020-01-01"),
          endDate: new Date("2022-12-31"),
          currentJob: false,
          description: "Worked on various projects",
        },
      ],
    };

    (updateExperience as jest.Mock).mockResolvedValue({
      success: true,
      message: "Experience updated successfully",
    });

    render(
      <AddExperience
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
        experienceToEdit={mockExperienceToEdit}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("combobox-title")).toBeInTheDocument();
    });

    const jobTitleSelect = screen.getByTestId(
      "combobox-title"
    ) as HTMLSelectElement;
    await user.selectOptions(jobTitleSelect, "title-2");

    // Wait for form to be dirty and valid
    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).not.toBeDisabled();
    });

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "success",
          description: "Experience has been updated successfully",
        })
      );
    });
  });

  it("should not render dialog when dialogOpen is false", () => {
    render(
      <AddExperience
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={false}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    expect(screen.queryByText("Add Experience")).not.toBeInTheDocument();
  });

  it("should load companies, job titles, and locations on mount", async () => {
    render(
      <AddExperience
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    await waitFor(() => {
      expect(getAllCompanies).toHaveBeenCalledTimes(1);
      expect(getAllJobTitles).toHaveBeenCalledTimes(1);
      expect(getAllJobLocations).toHaveBeenCalledTimes(1);
    });
  });

  it("should display loading indicator when form is submitting", async () => {
    (addExperience as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ success: true }), 100);
        })
    );

    render(
      <AddExperience
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("combobox-title")).toBeInTheDocument();
    });

    const jobTitleSelect = screen.getByTestId("combobox-title");
    const companySelect = screen.getByTestId("combobox-company");
    const locationSelect = screen.getByTestId("combobox-location");
    const startDateInput = screen.getByTestId("datepicker-startDate");
    const jobDescriptionEditor = screen.getByTestId("tiptap-editor");

    fireEvent.change(jobTitleSelect, { target: { value: "title-1" } });
    fireEvent.change(companySelect, { target: { value: "company-1" } });
    fireEvent.change(locationSelect, { target: { value: "location-1" } });
    fireEvent.change(startDateInput, { target: { value: "2023-01-01" } });
    fireEvent.change(jobDescriptionEditor, {
      target: { value: "Developed amazing features" },
    });

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    const loader = screen
      .getByText(/save/i)
      .parentElement?.querySelector(".spinner");
    expect(loader).toBeInTheDocument();

    await waitFor(() => {
      expect(addExperience).toHaveBeenCalledTimes(1);
    });
  });
});
