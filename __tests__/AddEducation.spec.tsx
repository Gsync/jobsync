import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddEducation from "@/components/profile/AddEducation";
import { addEducation, updateEducation } from "@/actions/profile.actions";
import { getAllJobLocations } from "@/actions/jobLocation.actions";

// Mock the actions
jest.mock("@/actions/profile.actions", () => ({
  addEducation: jest.fn(),
  updateEducation: jest.fn(),
}));

jest.mock("@/actions/jobLocation.actions", () => ({
  getAllJobLocations: jest.fn(),
}));

// Mock toast
jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

// Mock Combobox component
jest.mock("@/components/ComboBox", () => ({
  Combobox: ({ field, options }: any) => (
    <select
      data-testid="combobox-location"
      value={field.value || ""}
      onChange={(e) => field.onChange(e.target.value)}
    >
      <option value="">Select...</option>
      {options?.map((option: any) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

// Mock DatePicker component
jest.mock("@/components/DatePicker", () => ({
  DatePicker: ({ field, isEnabled }: any) => (
    <input
      type="date"
      data-testid={`datepicker-${field.name}`}
      value={
        field.value ? new Date(field.value).toISOString().split("T")[0] : ""
      }
      onChange={(e) => field.onChange(new Date(e.target.value))}
      disabled={!isEnabled}
    />
  ),
}));

// Mock TiptapEditor component
jest.mock("@/components/TiptapEditor", () => ({
  __esModule: true,
  default: ({ field }: any) => (
    <textarea
      data-testid="tiptap-editor"
      value={field.value || ""}
      onChange={(e) => field.onChange(e.target.value)}
    />
  ),
}));

describe("AddEducation Component", () => {
  const user = userEvent.setup();
  const mockResumeId = "resume-123";
  const mockSectionId = "section-456";
  const mockSetDialogOpen = jest.fn();

  const mockLocations = [
    { id: "location-1", label: "New York, NY", value: "New York, NY" },
    {
      id: "location-2",
      label: "San Francisco, CA",
      value: "San Francisco, CA",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getAllJobLocations as jest.Mock).mockResolvedValue(mockLocations);
  });

  it("should render Add Education dialog with correct title", async () => {
    render(
      <AddEducation
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Add Education")).toBeInTheDocument();
    });
  });

  it("should render Edit Education dialog when educationToEdit is provided", async () => {
    const mockEducationToEdit = {
      id: "education-1",
      educations: [
        {
          id: "edu-1",
          institution: "Stanford University",
          degree: "Bachelor's",
          fieldOfStudy: "Computer Science",
          location: {
            id: "location-1",
            label: "Stanford, CA",
            value: "Stanford, CA",
          },
          startDate: new Date("2018-09-01"),
          endDate: new Date("2022-06-01"),
          description: "Studied computer science",
        },
      ],
    };

    render(
      <AddEducation
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
        educationToEdit={mockEducationToEdit as any}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Edit Education")).toBeInTheDocument();
    });
  });

  it("should render section title field when sectionId is not provided", async () => {
    render(
      <AddEducation
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
      <AddEducation
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Add Education")).toBeInTheDocument();
    });

    expect(screen.queryByLabelText(/section title/i)).not.toBeInTheDocument();
  });

  it("should render all form fields correctly", async () => {
    render(
      <AddEducation
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("School")).toBeInTheDocument();
      expect(screen.getByTestId("combobox-location")).toBeInTheDocument();
      expect(screen.getByText("Degree")).toBeInTheDocument();
      expect(screen.getByText("Field of study")).toBeInTheDocument();
      expect(screen.getByText("Start Date")).toBeInTheDocument();
      expect(screen.getByText("End Date")).toBeInTheDocument();
      expect(screen.getByText(/degree completed/i)).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
    });
  });

  it("should populate form fields when editing an education", async () => {
    const mockEducationToEdit = {
      id: "education-1",
      educations: [
        {
          id: "edu-1",
          institution: "Stanford University",
          degree: "Bachelor's",
          fieldOfStudy: "Computer Science",
          location: {
            id: "location-1",
            label: "Stanford, CA",
            value: "Stanford, CA",
          },
          startDate: new Date("2018-09-01"),
          endDate: new Date("2022-06-01"),
          description: "Studied computer science",
        },
      ],
    };

    render(
      <AddEducation
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
        educationToEdit={mockEducationToEdit as any}
      />
    );

    await waitFor(() => {
      const institutionInput = screen.getByPlaceholderText(
        "Ex: Stanford"
      ) as HTMLInputElement;
      expect(institutionInput.value).toBe("Stanford University");

      const degreeInput = screen.getByPlaceholderText(
        "Ex: Bachelor's"
      ) as HTMLInputElement;
      expect(degreeInput.value).toBe("Bachelor's");

      const fieldOfStudyInput = screen.getByPlaceholderText(
        "Ex: Computer Science"
      ) as HTMLInputElement;
      expect(fieldOfStudyInput.value).toBe("Computer Science");
    });
  });

  it("should close dialog when Cancel button is clicked", async () => {
    render(
      <AddEducation
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Add Education")).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockSetDialogOpen).toHaveBeenCalledWith(false);
  });

  it("should toggle degree completed label text", async () => {
    render(
      <AddEducation
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/degree completed/i)).toBeInTheDocument();
    });

    const degreeCompletedSwitch = screen.getByRole("switch");
    await user.click(degreeCompletedSwitch);

    await waitFor(() => {
      expect(screen.getByText(/currently studying/i)).toBeInTheDocument();
    });
  });

  it("should call addEducation when submitting a new education", async () => {
    (addEducation as jest.Mock).mockResolvedValue({
      success: true,
      message: "Education added successfully",
    });

    render(
      <AddEducation
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    // Wait for options to be loaded and rendered in the select element
    await waitFor(() => {
      const locationSelect = screen.getByTestId(
        "combobox-location"
      ) as HTMLSelectElement;
      expect(locationSelect.options.length).toBeGreaterThan(1);
    });

    const institutionInput = screen.getByPlaceholderText(
      "Ex: Stanford"
    ) as HTMLInputElement;
    const locationSelect = screen.getByTestId(
      "combobox-location"
    ) as HTMLSelectElement;
    const degreeInput = screen.getByPlaceholderText(
      "Ex: Bachelor's"
    ) as HTMLInputElement;
    const fieldOfStudyInput = screen.getByPlaceholderText(
      "Ex: Computer Science"
    ) as HTMLInputElement;
    const startDateInput = screen.getByTestId(
      "datepicker-startDate"
    ) as HTMLInputElement;
    const descriptionEditor = screen.getByTestId(
      "tiptap-editor"
    ) as HTMLTextAreaElement;

    await user.type(institutionInput, "MIT");
    await user.selectOptions(locationSelect, "location-1");
    await user.type(degreeInput, "Master's");
    await user.type(fieldOfStudyInput, "Artificial Intelligence");
    await user.type(startDateInput, "2020-09-01");
    await user.type(descriptionEditor, "Advanced AI studies");

    // Wait for form to be valid
    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).not.toBeDisabled();
    });

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(addEducation).toHaveBeenCalledTimes(1);
      expect(addEducation).toHaveBeenCalledWith(
        expect.objectContaining({
          institution: "MIT",
          location: "location-1",
          degree: "Master's",
          fieldOfStudy: "Artificial Intelligence",
          description: "Advanced AI studies",
        })
      );
    });
  });

  it("should call updateEducation when editing an existing education", async () => {
    const mockEducationToEdit = {
      id: "education-1",
      educations: [
        {
          id: "edu-1",
          institution: "Stanford University",
          degree: "Bachelor's",
          fieldOfStudy: "Computer Science",
          location: {
            id: "location-1",
            label: "Stanford, CA",
            value: "Stanford, CA",
          },
          startDate: new Date("2018-09-01"),
          endDate: new Date("2022-06-01"),
          description: "Studied computer science",
        },
      ],
    };

    (updateEducation as jest.Mock).mockResolvedValue({
      success: true,
      message: "Education updated successfully",
    });

    render(
      <AddEducation
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
        educationToEdit={mockEducationToEdit as any}
      />
    );

    await waitFor(() => {
      const institutionInput = screen.getByPlaceholderText(
        "Ex: Stanford"
      ) as HTMLInputElement;
      expect(institutionInput.value).toBe("Stanford University");
    });

    const degreeInput = screen.getByPlaceholderText(
      "Ex: Bachelor's"
    ) as HTMLInputElement;
    await user.clear(degreeInput);
    await user.type(degreeInput, "Master's");

    // Wait for form to be valid
    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).not.toBeDisabled();
    });

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(updateEducation).toHaveBeenCalledTimes(1);
      expect(updateEducation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "edu-1",
          degree: "Master's",
        })
      );
    });
  });

  it("should close dialog and show success toast on successful submission", async () => {
    const { toast } = require("@/components/ui/use-toast");

    (addEducation as jest.Mock).mockResolvedValue({
      success: true,
      message: "Education added successfully",
    });

    render(
      <AddEducation
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    // Wait for options to be loaded
    await waitFor(() => {
      const locationSelect = screen.getByTestId(
        "combobox-location"
      ) as HTMLSelectElement;
      expect(locationSelect.options.length).toBeGreaterThan(1);
    });

    const institutionInput = screen.getByPlaceholderText(
      "Ex: Stanford"
    ) as HTMLInputElement;
    const locationSelect = screen.getByTestId(
      "combobox-location"
    ) as HTMLSelectElement;
    const degreeInput = screen.getByPlaceholderText(
      "Ex: Bachelor's"
    ) as HTMLInputElement;
    const fieldOfStudyInput = screen.getByPlaceholderText(
      "Ex: Computer Science"
    ) as HTMLInputElement;
    const startDateInput = screen.getByTestId(
      "datepicker-startDate"
    ) as HTMLInputElement;

    await user.type(institutionInput, "Harvard");
    await user.selectOptions(locationSelect, "location-1");
    await user.type(degreeInput, "PhD");
    await user.type(fieldOfStudyInput, "Mathematics");
    await user.type(startDateInput, "2019-09-01");

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
          description: expect.stringContaining("added"),
        })
      );
    });
  });

  it("should show error toast on failed submission", async () => {
    const { toast } = require("@/components/ui/use-toast");

    (addEducation as jest.Mock).mockResolvedValue({
      success: false,
      message: "Failed to add education",
    });

    render(
      <AddEducation
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    // Wait for options to be loaded
    await waitFor(() => {
      const locationSelect = screen.getByTestId(
        "combobox-location"
      ) as HTMLSelectElement;
      expect(locationSelect.options.length).toBeGreaterThan(1);
    });

    const institutionInput = screen.getByPlaceholderText(
      "Ex: Stanford"
    ) as HTMLInputElement;
    const locationSelect = screen.getByTestId(
      "combobox-location"
    ) as HTMLSelectElement;
    const degreeInput = screen.getByPlaceholderText(
      "Ex: Bachelor's"
    ) as HTMLInputElement;
    const fieldOfStudyInput = screen.getByPlaceholderText(
      "Ex: Computer Science"
    ) as HTMLInputElement;
    const startDateInput = screen.getByTestId(
      "datepicker-startDate"
    ) as HTMLInputElement;

    await user.type(institutionInput, "Yale");
    await user.selectOptions(locationSelect, "location-2");
    await user.type(degreeInput, "Bachelor's");
    await user.type(fieldOfStudyInput, "Physics");
    await user.type(startDateInput, "2021-09-01");

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
          description: "Failed to add education",
        })
      );
      expect(mockSetDialogOpen).not.toHaveBeenCalledWith(false);
    });
  });

  it("should show updated success message when editing", async () => {
    const { toast } = require("@/components/ui/use-toast");

    const mockEducationToEdit = {
      id: "education-1",
      educations: [
        {
          id: "edu-1",
          institution: "MIT",
          degree: "Bachelor's",
          fieldOfStudy: "Engineering",
          location: {
            id: "location-1",
            label: "Cambridge, MA",
            value: "Cambridge, MA",
          },
          startDate: new Date("2017-09-01"),
          endDate: new Date("2021-06-01"),
          description: "Engineering studies",
        },
      ],
    };

    (updateEducation as jest.Mock).mockResolvedValue({
      success: true,
      message: "Education updated successfully",
    });

    render(
      <AddEducation
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
        educationToEdit={mockEducationToEdit as any}
      />
    );

    await waitFor(() => {
      const institutionInput = screen.getByPlaceholderText(
        "Ex: Stanford"
      ) as HTMLInputElement;
      expect(institutionInput.value).toBe("MIT");
    });

    const institutionInput = screen.getByPlaceholderText(
      "Ex: Stanford"
    ) as HTMLInputElement;
    await user.clear(institutionInput);
    await user.type(institutionInput, "MIT Updated");

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
          variant: "success",
          description: expect.stringContaining("updated"),
        })
      );
    });
  });

  it("should not render dialog when dialogOpen is false", () => {
    const { container } = render(
      <AddEducation
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={false}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    expect(screen.queryByText("Add Education")).not.toBeInTheDocument();
    expect(container.querySelector("form")).not.toBeInTheDocument();
  });

  it("should load locations on mount", async () => {
    render(
      <AddEducation
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    await waitFor(() => {
      expect(getAllJobLocations).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      const locationSelect = screen.getByTestId(
        "combobox-location"
      ) as HTMLSelectElement;
      expect(locationSelect.options.length).toBe(3); // "Select..." + 2 locations
    });
  });

  it("should display loading indicator when form is submitting", async () => {
    (addEducation as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ success: true, message: "Success" }), 100)
        )
    );

    render(
      <AddEducation
        resumeId={mockResumeId}
        sectionId={mockSectionId}
        dialogOpen={true}
        setDialogOpen={mockSetDialogOpen}
      />
    );

    // Wait for options to be loaded
    await waitFor(() => {
      const locationSelect = screen.getByTestId(
        "combobox-location"
      ) as HTMLSelectElement;
      expect(locationSelect.options.length).toBeGreaterThan(1);
    });

    const institutionInput = screen.getByPlaceholderText(
      "Ex: Stanford"
    ) as HTMLInputElement;
    const locationSelect = screen.getByTestId(
      "combobox-location"
    ) as HTMLSelectElement;
    const degreeInput = screen.getByPlaceholderText(
      "Ex: Bachelor's"
    ) as HTMLInputElement;
    const fieldOfStudyInput = screen.getByPlaceholderText(
      "Ex: Computer Science"
    ) as HTMLInputElement;
    const startDateInput = screen.getByTestId(
      "datepicker-startDate"
    ) as HTMLInputElement;

    await user.type(institutionInput, "Oxford");
    await user.selectOptions(locationSelect, "location-1");
    await user.type(degreeInput, "Master's");
    await user.type(fieldOfStudyInput, "Literature");
    await user.type(startDateInput, "2022-09-01");

    // Wait for form to be valid
    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).not.toBeDisabled();
    });

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    // Check for loading spinner
    await waitFor(() => {
      expect(screen.getByText("Save").closest("button")).toContainHTML(
        "spinner"
      );
    });
  });
});
