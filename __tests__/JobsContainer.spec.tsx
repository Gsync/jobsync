import JobsContainer from "@/components/myjobs/JobsContainer";
import "@testing-library/jest-dom";
import { screen, render, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  getJobsList,
  getJobDetails,
  deleteJobById,
  updateJobStatus,
} from "@/actions/job.actions";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

jest.mock("next-auth", () => {
  const mockAuth = jest.fn();
  const mockSignIn = jest.fn();
  const mockSignOut = jest.fn();
  const mockHandlers = { GET: jest.fn(), POST: jest.fn() };

  return {
    __esModule: true,
    default: jest.fn(() => ({
      auth: mockAuth,
      handlers: mockHandlers,
      signIn: mockSignIn,
      signOut: mockSignOut,
    })),
    auth: mockAuth,
    signIn: mockSignIn,
    signOut: mockSignOut,
    handlers: mockHandlers,
  };
});

jest.mock("next-auth/providers/credentials", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    id: "credentials",
    name: "Credentials",
    type: "credentials",
  })),
}));

jest.mock("@/actions/job.actions", () => ({
  getJobsList: jest.fn(),
  getJobDetails: jest.fn(),
  deleteJobById: jest.fn(),
  updateJobStatus: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
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

describe("JobsContainer Search Functionality", () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  const mockSearchParams = new URLSearchParams();

  const mockStatuses = [
    { id: "1", label: "Applied", value: "applied" },
    { id: "2", label: "Interview", value: "interview" },
    { id: "3", label: "Draft", value: "draft" },
    { id: "4", label: "Rejected", value: "rejected" },
  ];

  const mockCompanies = [
    { id: "1", label: "Amazon", value: "amazon", createdBy: "user-1" },
    { id: "2", label: "Google", value: "google", createdBy: "user-1" },
  ];

  const mockTitles = [
    {
      id: "1",
      label: "Full Stack Developer",
      value: "full stack developer",
      createdBy: "user-1",
    },
    {
      id: "2",
      label: "Frontend Developer",
      value: "frontend developer",
      createdBy: "user-1",
    },
  ];

  const mockLocations = [
    { id: "1", label: "Remote", value: "remote", createdBy: "user-1" },
    { id: "2", label: "San Francisco", value: "san francisco", createdBy: "user-1" },
  ];

  const mockSources = [
    { id: "1", label: "Indeed", value: "indeed", createdBy: "user-1" },
    { id: "2", label: "LinkedIn", value: "linkedin", createdBy: "user-1" },
  ];

  const mockJobs = [
    {
      id: "1",
      userId: "user-1",
      JobTitle: { id: "1", label: "Full Stack Developer", value: "full stack developer", createdBy: "user-1" },
      Company: { id: "1", label: "Amazon", value: "amazon", createdBy: "user-1", logoUrl: "" },
      Location: { id: "1", label: "Remote", value: "remote", createdBy: "user-1" },
      Status: { id: "1", label: "Applied", value: "applied" },
      JobSource: { id: "1", label: "Indeed", value: "indeed" },
      jobType: "FT",
      appliedDate: new Date("2024-06-19"),
      dueDate: new Date("2024-06-22"),
    },
    {
      id: "2",
      userId: "user-1",
      JobTitle: { id: "2", label: "Frontend Developer", value: "frontend developer", createdBy: "user-1" },
      Company: { id: "2", label: "Google", value: "google", createdBy: "user-1", logoUrl: "" },
      Location: { id: "2", label: "San Francisco", value: "san francisco", createdBy: "user-1" },
      Status: { id: "2", label: "Interview", value: "interview" },
      JobSource: { id: "2", label: "LinkedIn", value: "linkedin" },
      jobType: "FT",
      appliedDate: new Date("2024-06-20"),
      dueDate: new Date("2024-06-25"),
    },
  ];

  const user = userEvent.setup({ delay: null });
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  window.HTMLElement.prototype.hasPointerCapture = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue("/dashboard/myjobs");
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderComponent = () => {
    return render(
      <JobsContainer
        statuses={mockStatuses}
        companies={mockCompanies}
        titles={mockTitles}
        locations={mockLocations}
        sources={mockSources}
      />
    );
  };

  describe("Search Input", () => {
    it("should render search input with placeholder", async () => {
      (getJobsList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search jobs...")).toBeInTheDocument();
      });
    });

    it("should update search input value when typing", async () => {
      (getJobsList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search jobs...")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search jobs...");

      await act(async () => {
        await user.type(searchInput, "Amazon");
      });

      expect(searchInput).toHaveValue("Amazon");
    });

    it("should debounce search input for 300ms", async () => {
      (getJobsList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledTimes(1);
      });

      const searchInput = screen.getByPlaceholderText("Search jobs...");

      await act(async () => {
        await user.type(searchInput, "A");
      });

      // Should not have called getJobsList yet (debounce not elapsed)
      expect(getJobsList).toHaveBeenCalledTimes(1);

      // Advance timer by 300ms to trigger debounce
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Now search should have been triggered
      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledTimes(2);
      });
    });

    it("should call getJobsList with search term after debounce", async () => {
      (getJobsList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledTimes(1);
      });

      const searchInput = screen.getByPlaceholderText("Search jobs...");

      await act(async () => {
        await user.type(searchInput, "Amazon");
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, "Amazon");
      });
    });

    it("should not trigger search on initial mount with empty search", async () => {
      (getJobsList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledTimes(1);
      });

      // Initial call should not have search parameter
      expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, undefined);
    });

    it("should trigger search when clearing search term after searching", async () => {
      (getJobsList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledTimes(1);
      });

      const searchInput = screen.getByPlaceholderText("Search jobs...");

      // Type to trigger search
      await act(async () => {
        await user.type(searchInput, "Test");
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, "Test");
      });

      // Clear the search input
      await act(async () => {
        await user.clear(searchInput);
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Should call with undefined when cleared after having searched
      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, undefined);
      });
    });
  });

  describe("Search with Filters", () => {
    it("should combine search with status filter", async () => {
      (getJobsList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search jobs...")).toBeInTheDocument();
      });

      // Type in search
      const searchInput = screen.getByPlaceholderText("Search jobs...");
      await act(async () => {
        await user.type(searchInput, "Developer");
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, "Developer");
      });

      // Now change filter
      const filterTrigger = screen.getByRole("combobox");
      await act(async () => {
        await user.click(filterTrigger);
      });

      const appliedOption = screen.getByRole("option", { name: "Applied" });
      await act(async () => {
        await user.click(appliedOption);
      });

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, "applied", "Developer");
      });
    });

    it("should preserve search when changing filter", async () => {
      (getJobsList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledTimes(1);
      });

      // Type in search
      const searchInput = screen.getByPlaceholderText("Search jobs...");
      await act(async () => {
        await user.type(searchInput, "Amazon");
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, "Amazon");
      });

      // Change filter
      const filterTrigger = screen.getByRole("combobox");
      await act(async () => {
        await user.click(filterTrigger);
      });

      const interviewOption = screen.getByRole("option", { name: "Interview" });
      await act(async () => {
        await user.click(interviewOption);
      });

      // Search term should still be present
      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, "interview", "Amazon");
      });
    });

    it("should clear filter but preserve search when selecting None filter", async () => {
      (getJobsList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledTimes(1);
      });

      // First type in search
      const searchInput = screen.getByPlaceholderText("Search jobs...");
      await act(async () => {
        await user.type(searchInput, "Developer");
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Set a filter
      const filterTrigger = screen.getByRole("combobox");
      await act(async () => {
        await user.click(filterTrigger);
      });

      const appliedOption = screen.getByRole("option", { name: "Applied" });
      await act(async () => {
        await user.click(appliedOption);
      });

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, "applied", "Developer");
      });

      // Now clear filter by selecting None
      await act(async () => {
        await user.click(filterTrigger);
      });

      const noneOption = screen.getByRole("option", { name: "None" });
      await act(async () => {
        await user.click(noneOption);
      });

      // Filter should be cleared but search preserved
      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, "Developer");
      });
    });
  });

  describe("Search Results Display", () => {
    it("should display filtered jobs after search", async () => {
      const amazonJob = [mockJobs[0]];

      (getJobsList as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          data: mockJobs,
          total: 2,
        })
        .mockResolvedValueOnce({
          success: true,
          data: amazonJob,
          total: 1,
        });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Amazon")).toBeInTheDocument();
        expect(screen.getByText("Google")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search jobs...");
      await act(async () => {
        await user.type(searchInput, "Amazon");
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText("Amazon")).toBeInTheDocument();
      });
    });

    it("should show loading state during search", async () => {
      let resolvePromise: (value: any) => void;
      const searchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (getJobsList as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          data: mockJobs,
          total: 2,
        })
        .mockReturnValueOnce(searchPromise);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Amazon")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search jobs...");
      await act(async () => {
        await user.type(searchInput, "test");
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Should show loading indicator
      await waitFor(() => {
        expect(screen.getByTestId("loader")).toBeInTheDocument();
      });

      // Resolve the search
      await act(async () => {
        resolvePromise!({
          success: true,
          data: [],
          total: 0,
        });
      });
    });
  });

  describe("Load More with Search", () => {
    it("should preserve search term when loading more", async () => {
      (getJobsList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 50,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Load More")).toBeInTheDocument();
      });

      // Type search
      const searchInput = screen.getByPlaceholderText("Search jobs...");
      await act(async () => {
        await user.type(searchInput, "Developer");
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, "Developer");
      });

      // Click load more
      const loadMoreButton = screen.getByText("Load More");
      await act(async () => {
        await user.click(loadMoreButton);
      });

      // Should include search term in load more call
      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(2, 25, undefined, "Developer");
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle search error gracefully", async () => {
      (getJobsList as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          data: mockJobs,
          total: 2,
        })
        .mockResolvedValueOnce({
          success: false,
          message: "Search failed",
        });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Amazon")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search jobs...");
      await act(async () => {
        await user.type(searchInput, "test");
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, "test");
      });
    });
  });
});
