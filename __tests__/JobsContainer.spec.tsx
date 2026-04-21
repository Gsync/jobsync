import JobsContainer from "@/components/myjobs/JobsContainer";
import { screen, render, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  getJobsList,
  getJobDetails,
  deleteJobById,
  updateJobStatus,
} from "@/actions/job.actions";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

vi.mock("next-auth", () => {
  const mockAuth = vi.fn();
  const mockSignIn = vi.fn();
  const mockSignOut = vi.fn();
  const mockHandlers = { GET: vi.fn(), POST: vi.fn() };

  return {
    __esModule: true,
    default: vi.fn(() => ({
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

vi.mock("next-auth/providers/credentials", () => ({
  __esModule: true,
  default: vi.fn(() => ({
    id: "credentials",
    name: "Credentials",
    type: "credentials",
  })),
}));

vi.mock("@/actions/job.actions", () => ({
  getJobsList: vi.fn(),
  getJobDetails: vi.fn(),
  deleteJobById: vi.fn(),
  updateJobStatus: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

let intersectionCallback: IntersectionObserverCallback;
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

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

describe("JobsContainer Search Functionality", () => {
  const mockRouter = {
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
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
    {
      id: "2",
      label: "San Francisco",
      value: "san francisco",
      createdBy: "user-1",
    },
  ];

  const mockSources = [
    { id: "1", label: "Indeed", value: "indeed", createdBy: "user-1" },
    { id: "2", label: "LinkedIn", value: "linkedin", createdBy: "user-1" },
  ];

  const mockJobs = [
    {
      id: "1",
      userId: "user-1",
      JobTitle: {
        id: "1",
        label: "Full Stack Developer",
        value: "full stack developer",
        createdBy: "user-1",
      },
      Company: {
        id: "1",
        label: "Amazon",
        value: "amazon",
        createdBy: "user-1",
        logoUrl: "",
      },
      Location: {
        id: "1",
        label: "Remote",
        value: "remote",
        createdBy: "user-1",
      },
      Status: { id: "1", label: "Applied", value: "applied" },
      JobSource: { id: "1", label: "Indeed", value: "indeed" },
      jobType: "FT",
      appliedDate: new Date("2024-06-19"),
      dueDate: new Date("2024-06-22"),
    },
    {
      id: "2",
      userId: "user-1",
      JobTitle: {
        id: "2",
        label: "Frontend Developer",
        value: "frontend developer",
        createdBy: "user-1",
      },
      Company: {
        id: "2",
        label: "Google",
        value: "google",
        createdBy: "user-1",
        logoUrl: "",
      },
      Location: {
        id: "2",
        label: "San Francisco",
        value: "san francisco",
        createdBy: "user-1",
      },
      Status: { id: "2", label: "Interview", value: "interview" },
      JobSource: { id: "2", label: "LinkedIn", value: "linkedin" },
      jobType: "FT",
      appliedDate: new Date("2024-06-20"),
      dueDate: new Date("2024-06-25"),
    },
  ];

  const user = userEvent.setup({ delay: null });
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    (useRouter as any).mockReturnValue(mockRouter);
    (usePathname as any).mockReturnValue("/dashboard/myjobs");
    (useSearchParams as any).mockReturnValue(mockSearchParams);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderComponent = () => {
    return render(
      <JobsContainer
        statuses={mockStatuses}
        companies={mockCompanies}
        titles={mockTitles}
        locations={mockLocations}
        sources={mockSources}
        tags={[]}
      />,
    );
  };

  describe("Search Input", () => {
    it("should render search input with placeholder", async () => {
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search jobs..."),
        ).toBeInTheDocument();
      });
    });

    it("should update search input value when typing", async () => {
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search jobs..."),
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search jobs...");

      await act(async () => {
        await user.type(searchInput, "Amazon");
      });

      expect(searchInput).toHaveValue("Amazon");
    });

    it("should debounce search input for 300ms", async () => {
      (getJobsList as any).mockResolvedValue({
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
        vi.advanceTimersByTime(300);
      });

      // Now search should have been triggered
      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledTimes(2);
      });
    });

    it("should call getJobsList with search term after debounce", async () => {
      (getJobsList as any).mockResolvedValue({
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
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, "Amazon", undefined, undefined, undefined, undefined, undefined);
      });
    });

    it("should not trigger search on initial mount with empty search", async () => {
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledTimes(1);
      });

      // Initial call should not have search parameter
      expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, undefined, undefined, undefined, undefined, undefined, undefined);
    });

    it("should trigger search when clearing search term after searching", async () => {
      (getJobsList as any).mockResolvedValue({
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
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, "Test", undefined, undefined, undefined, undefined, undefined);
      });

      // Clear the search input
      await act(async () => {
        await user.clear(searchInput);
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // Should call with undefined when cleared after having searched
      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, undefined, undefined, undefined, undefined, undefined, undefined);
      });
    });
  });

  describe("Search with Filters", () => {
    it("should combine search with status filter", async () => {
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search jobs..."),
        ).toBeInTheDocument();
      });

      // Type in search
      const searchInput = screen.getByPlaceholderText("Search jobs...");
      await act(async () => {
        await user.type(searchInput, "Developer");
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, "Developer", undefined, undefined, undefined, undefined, undefined);
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
        expect(getJobsList).toHaveBeenCalledWith(1, 25, "applied", "Developer", undefined, undefined, undefined, undefined, undefined);
      });
    });

    it("should preserve search when changing filter", async () => {
      (getJobsList as any).mockResolvedValue({
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
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, "Amazon", undefined, undefined, undefined, undefined, undefined);
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
        expect(getJobsList).toHaveBeenCalledWith(1, 25, "interview", "Amazon", undefined, undefined, undefined, undefined, undefined);
      });
    });

    it("should clear filter but preserve search when selecting None filter", async () => {
      (getJobsList as any).mockResolvedValue({
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
        vi.advanceTimersByTime(300);
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
        expect(getJobsList).toHaveBeenCalledWith(1, 25, "applied", "Developer", undefined, undefined, undefined, undefined, undefined);
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
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, "Developer", undefined, undefined, undefined, undefined, undefined);
      });
    });
  });

  describe("Search Results Display", () => {
    it("should display filtered jobs after search", async () => {
      const amazonJob = [mockJobs[0]];

      (getJobsList as any)
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
        vi.advanceTimersByTime(300);
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

      (getJobsList as any)
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
        vi.advanceTimersByTime(300);
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

  describe("Infinite Scroll with Search", () => {
    it("should preserve search term when loading more via scroll", async () => {
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 50,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Amazon")).toBeInTheDocument();
      });

      // Type search
      const searchInput = screen.getByPlaceholderText("Search jobs...");
      await act(async () => {
        await user.type(searchInput, "Developer");
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, "Developer", undefined, undefined, undefined, undefined, undefined);
      });

      // Simulate sentinel becoming visible
      await act(async () => {
        intersectionCallback(
          [{ isIntersecting: true }] as IntersectionObserverEntry[],
          {} as IntersectionObserver,
        );
      });

      // Should include search term in infinite scroll call
      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(2, 25, undefined, "Developer", undefined, undefined, undefined, undefined, undefined);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle search error gracefully", async () => {
      (getJobsList as any)
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
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, "test", undefined, undefined, undefined, undefined, undefined);
      });
    });
  });

  describe("Company Filter from URL", () => {
    it("should pass company filter to getJobsList when URL has company param", async () => {
      const companySearchParams = new URLSearchParams("company=google&applied=true");
      (useSearchParams as any).mockReturnValue(companySearchParams);
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, undefined, "google", true, undefined, undefined, undefined);
      });
    });

    it("should show company badge when company param is present", async () => {
      const companySearchParams = new URLSearchParams("company=google&applied=true");
      (useSearchParams as any).mockReturnValue(companySearchParams);
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Google")).toBeInTheDocument();
      });
    });

    it("should clear company filter when badge is clicked", async () => {
      const companySearchParams = new URLSearchParams("company=google&applied=true");
      (useSearchParams as any).mockReturnValue(companySearchParams);
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Google")).toBeInTheDocument();
      });

      const badges = screen.getAllByText("Google");
      const badge = badges[0].closest("button")!;
      await act(async () => {
        await user.click(badge);
      });

      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard/myjobs");
    });

    it("should not show company badge when no company param", async () => {
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledTimes(1);
      });

      const googleButtons = screen.queryAllByRole("button").filter(
        (btn) => btn.textContent?.includes("Google"),
      );
      expect(googleButtons).toHaveLength(0);
    });

    it("should combine company filter with status filter", async () => {
      const companySearchParams = new URLSearchParams("company=google&applied=true");
      (useSearchParams as any).mockReturnValue(companySearchParams);
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, undefined, "google", true, undefined, undefined, undefined);
      });

      const filterTrigger = screen.getByRole("combobox");
      await act(async () => {
        await user.click(filterTrigger);
      });

      const appliedOption = screen.getByRole("option", { name: "Applied" });
      await act(async () => {
        await user.click(appliedOption);
      });

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, "applied", undefined, "google", true, undefined, undefined, undefined);
      });
    });
  });

  describe("Title Filter from URL", () => {
    it("should pass title filter to getJobsList when URL has title param", async () => {
      const titleSearchParams = new URLSearchParams("title=full+stack+developer&applied=true");
      (useSearchParams as any).mockReturnValue(titleSearchParams);
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, undefined, undefined, true, "full stack developer", undefined, undefined);
      });
    });

    it("should show title badge when title param is present", async () => {
      const titleSearchParams = new URLSearchParams("title=full+stack+developer&applied=true");
      (useSearchParams as any).mockReturnValue(titleSearchParams);
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Full Stack Developer")).toBeInTheDocument();
      });
    });

    it("should clear title filter when badge is clicked", async () => {
      const titleSearchParams = new URLSearchParams("title=full+stack+developer&applied=true");
      (useSearchParams as any).mockReturnValue(titleSearchParams);
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Full Stack Developer")).toBeInTheDocument();
      });

      const badges = screen.getAllByText("Full Stack Developer");
      const badge = badges[0].closest("button")!;
      await act(async () => {
        await user.click(badge);
      });

      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard/myjobs");
    });
  });

  describe("Location Filter from URL", () => {
    it("should pass location filter to getJobsList when URL has location param", async () => {
      const locationSearchParams = new URLSearchParams("location=remote&applied=true");
      (useSearchParams as any).mockReturnValue(locationSearchParams);
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, undefined, undefined, true, undefined, "remote", undefined);
      });
    });

    it("should show location badge when location param is present", async () => {
      const locationSearchParams = new URLSearchParams("location=remote&applied=true");
      (useSearchParams as any).mockReturnValue(locationSearchParams);
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Remote")).toBeInTheDocument();
      });
    });

    it("should clear location filter when badge is clicked", async () => {
      const locationSearchParams = new URLSearchParams("location=remote&applied=true");
      (useSearchParams as any).mockReturnValue(locationSearchParams);
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Remote")).toBeInTheDocument();
      });

      const badges = screen.getAllByText("Remote");
      const badge = badges[0].closest("button")!;
      await act(async () => {
        await user.click(badge);
      });

      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard/myjobs");
    });
  });

  describe("Source Filter from URL", () => {
    it("should pass source filter to getJobsList when URL has source param", async () => {
      const sourceSearchParams = new URLSearchParams("source=indeed&applied=true");
      (useSearchParams as any).mockReturnValue(sourceSearchParams);
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(getJobsList).toHaveBeenCalledWith(1, 25, undefined, undefined, undefined, true, undefined, undefined, "indeed");
      });
    });

    it("should show source badge when source param is present", async () => {
      const sourceSearchParams = new URLSearchParams("source=indeed&applied=true");
      (useSearchParams as any).mockReturnValue(sourceSearchParams);
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });
    });

    it("should clear source filter when badge is clicked", async () => {
      const sourceSearchParams = new URLSearchParams("source=indeed&applied=true");
      (useSearchParams as any).mockReturnValue(sourceSearchParams);
      (getJobsList as any).mockResolvedValue({
        success: true,
        data: mockJobs,
        total: 2,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Indeed")).toBeInTheDocument();
      });

      const badges = screen.getAllByText("Indeed");
      const badge = badges[0].closest("button")!;
      await act(async () => {
        await user.click(badge);
      });

      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard/myjobs");
    });
  });
});
