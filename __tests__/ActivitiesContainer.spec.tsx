import ActivitiesContainer from "@/components/activities/ActivitiesContainer";
import { ActivityProvider } from "@/context/ActivityContext";
import "@testing-library/jest-dom";
import { screen, render, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  getActivitiesList,
  getCurrentActivity,
  startActivityById,
  stopActivityById,
} from "@/actions/activity.actions";

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

jest.mock("@/actions/activity.actions", () => ({
  getActivitiesList: jest.fn(),
  getCurrentActivity: jest.fn(),
  startActivityById: jest.fn(),
  stopActivityById: jest.fn(),
  getAllActivityTypes: jest.fn(),
  createActivityType: jest.fn(),
  createActivity: jest.fn(),
  deleteActivityById: jest.fn(),
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

describe("ActivitiesContainer Search Functionality", () => {
  const mockActivities = [
    {
      id: "1",
      activityName: "TypeScript Learning",
      startTime: new Date("2024-06-19T09:00:00"),
      endTime: new Date("2024-06-19T10:00:00"),
      duration: 60,
      description: "Learning TypeScript advanced concepts",
      createdAt: new Date("2024-06-19"),
      activityType: { id: "1", label: "Learning", value: "learning" },
    },
    {
      id: "2",
      activityName: "Build Portfolio",
      startTime: new Date("2024-06-19T11:00:00"),
      endTime: new Date("2024-06-19T12:30:00"),
      duration: 90,
      description: "Working on portfolio website",
      createdAt: new Date("2024-06-19"),
      activityType: { id: "2", label: "Side Project", value: "side-project" },
    },
    {
      id: "3",
      activityName: "Job Search",
      startTime: new Date("2024-06-20T14:00:00"),
      endTime: new Date("2024-06-20T15:00:00"),
      duration: 60,
      description: "Applying to developer positions",
      createdAt: new Date("2024-06-20"),
      activityType: { id: "3", label: "Job Search", value: "job-search" },
    },
  ];

  const user = userEvent.setup({ delay: null });
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  window.HTMLElement.prototype.hasPointerCapture = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (getCurrentActivity as jest.Mock).mockResolvedValue({ success: false });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderComponent = () => {
    return render(
      <ActivityProvider>
        <ActivitiesContainer />
      </ActivityProvider>
    );
  };

  describe("Search Input", () => {
    it("should render search input with placeholder", async () => {
      (getActivitiesList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockActivities,
        total: 3,
      });

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search activities...")
        ).toBeInTheDocument();
      });
    });

    it("should update search input value when typing", async () => {
      (getActivitiesList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockActivities,
        total: 3,
      });

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search activities...")
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search activities...");

      await act(async () => {
        await user.type(searchInput, "TypeScript");
      });

      expect(searchInput).toHaveValue("TypeScript");
    });

    it("should debounce search input for 300ms", async () => {
      (getActivitiesList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockActivities,
        total: 3,
      });

      renderComponent();

      await waitFor(() => {
        expect(getActivitiesList).toHaveBeenCalledTimes(1);
      });

      const searchInput = screen.getByPlaceholderText("Search activities...");

      await act(async () => {
        await user.type(searchInput, "T");
      });

      // Should not have called getActivitiesList yet (debounce not elapsed)
      expect(getActivitiesList).toHaveBeenCalledTimes(1);

      // Advance timer by 300ms to trigger debounce
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Now search should have been triggered
      await waitFor(() => {
        expect(getActivitiesList).toHaveBeenCalledTimes(2);
      });
    });

    it("should call getActivitiesList with search term after debounce", async () => {
      (getActivitiesList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockActivities,
        total: 3,
      });

      renderComponent();

      await waitFor(() => {
        expect(getActivitiesList).toHaveBeenCalledTimes(1);
      });

      const searchInput = screen.getByPlaceholderText("Search activities...");

      await act(async () => {
        await user.type(searchInput, "Learning");
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getActivitiesList).toHaveBeenCalledWith(1, 25, "Learning");
      });
    });

    it("should not trigger search on initial mount with empty search", async () => {
      (getActivitiesList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockActivities,
        total: 3,
      });

      renderComponent();

      await waitFor(() => {
        expect(getActivitiesList).toHaveBeenCalledTimes(1);
      });

      // Initial call should not have search parameter
      expect(getActivitiesList).toHaveBeenCalledWith(1, 25, undefined);
    });

    it("should trigger search when clearing search term after searching", async () => {
      (getActivitiesList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockActivities,
        total: 3,
      });

      renderComponent();

      await waitFor(() => {
        expect(getActivitiesList).toHaveBeenCalledTimes(1);
      });

      const searchInput = screen.getByPlaceholderText("Search activities...");

      // Type to trigger search
      await act(async () => {
        await user.type(searchInput, "Test");
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getActivitiesList).toHaveBeenCalledWith(1, 25, "Test");
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
        expect(getActivitiesList).toHaveBeenCalledWith(1, 25, undefined);
      });
    });
  });

  describe("Search Results Display", () => {
    it("should display filtered activities after search", async () => {
      const learningActivity = [mockActivities[0]];

      (getActivitiesList as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          data: mockActivities,
          total: 3,
        })
        .mockResolvedValueOnce({
          success: true,
          data: learningActivity,
          total: 1,
        });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("TypeScript Learning")).toBeInTheDocument();
        expect(screen.getByText("Build Portfolio")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search activities...");
      await act(async () => {
        await user.type(searchInput, "TypeScript");
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText("TypeScript Learning")).toBeInTheDocument();
      });
    });

    it("should show loading state during search", async () => {
      let resolvePromise: (value: any) => void;
      const searchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (getActivitiesList as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          data: mockActivities,
          total: 3,
        })
        .mockReturnValueOnce(searchPromise);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("TypeScript Learning")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search activities...");
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
      (getActivitiesList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockActivities,
        total: 50,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Load More")).toBeInTheDocument();
      });

      // Type search
      const searchInput = screen.getByPlaceholderText("Search activities...");
      await act(async () => {
        await user.type(searchInput, "Learning");
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getActivitiesList).toHaveBeenCalledWith(1, 25, "Learning");
      });

      // Click load more
      const loadMoreButton = screen.getByText("Load More");
      await act(async () => {
        await user.click(loadMoreButton);
      });

      // Should include search term in load more call
      await waitFor(() => {
        expect(getActivitiesList).toHaveBeenCalledWith(2, 25, "Learning");
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle search error gracefully", async () => {
      (getActivitiesList as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          data: mockActivities,
          total: 3,
        })
        .mockResolvedValueOnce({
          success: false,
          message: "Search failed",
        });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("TypeScript Learning")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search activities...");
      await act(async () => {
        await user.type(searchInput, "test");
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getActivitiesList).toHaveBeenCalledWith(1, 25, "test");
      });
    });
  });

  describe("Search UI Elements", () => {
    it("should render search icon", async () => {
      (getActivitiesList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockActivities,
        total: 3,
      });

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search activities...")
        ).toBeInTheDocument();
      });

      // Search input should have the correct container structure
      const searchInput = screen.getByPlaceholderText("Search activities...");
      expect(searchInput).toHaveClass("pl-8");
    });

    it("should have correct input type", async () => {
      (getActivitiesList as jest.Mock).mockResolvedValue({
        success: true,
        data: mockActivities,
        total: 3,
      });

      renderComponent();

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText("Search activities...");
        expect(searchInput).toHaveAttribute("type", "search");
      });
    });
  });
});
