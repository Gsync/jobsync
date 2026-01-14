import TasksPageClient from "@/app/dashboard/tasks/TasksPageClient";
import "@testing-library/jest-dom";
import { screen, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getTasksList } from "@/actions/task.actions";

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

jest.mock("@/actions/task.actions", () => ({
  getTasksList: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
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

describe("TasksPageClient Component", () => {
  const mockActivityTypes = [
    {
      id: "type-1",
      label: "Development",
      value: "development",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "type-2",
      label: "Testing",
      value: "testing",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockActivityTypesWithCounts = [
    {
      id: "type-1",
      label: "Development",
      value: "development",
      taskCount: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "type-2",
      label: "Testing",
      value: "testing",
      taskCount: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const user = userEvent.setup({ skipHover: true });
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  window.HTMLElement.prototype.hasPointerCapture = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getTasksList as jest.Mock).mockResolvedValue({
      success: true,
      data: [],
      total: 0,
    });
  });

  describe("Rendering", () => {
    it("should render TasksSidebar and TasksContainer components", () => {
      render(
        <TasksPageClient
          activityTypes={mockActivityTypes}
          activityTypesWithCounts={mockActivityTypesWithCounts}
          totalTasks={8}
        />
      );

      // Check if sidebar is rendered
      expect(screen.getByText("Activity Types")).toBeInTheDocument();
      expect(screen.getByText("Development")).toBeInTheDocument();
      expect(screen.getByText("Testing")).toBeInTheDocument();

      // Check if container is rendered
      expect(screen.getByText("My Tasks")).toBeInTheDocument();
    });

    it("should display total task count in sidebar", () => {
      render(
        <TasksPageClient
          activityTypes={mockActivityTypes}
          activityTypesWithCounts={mockActivityTypesWithCounts}
          totalTasks={8}
        />
      );

      expect(screen.getByText("8")).toBeInTheDocument();
    });

    it("should display task counts for each activity type", () => {
      render(
        <TasksPageClient
          activityTypes={mockActivityTypes}
          activityTypesWithCounts={mockActivityTypesWithCounts}
          totalTasks={8}
        />
      );

      expect(screen.getByText("5")).toBeInTheDocument(); // Development count
      expect(screen.getByText("3")).toBeInTheDocument(); // Testing count
    });
  });

  describe("Filter Management", () => {
    it("should start with no filter selected", () => {
      render(
        <TasksPageClient
          activityTypes={mockActivityTypes}
          activityTypesWithCounts={mockActivityTypesWithCounts}
          totalTasks={8}
        />
      );

      const allButton = screen.getByRole("button", { name: /All/i });
      expect(allButton).toHaveClass("bg-accent");
    });

    it("should update filter when activity type is clicked in sidebar", async () => {
      (getTasksList as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
        total: 0,
      });

      render(
        <TasksPageClient
          activityTypes={mockActivityTypes}
          activityTypesWithCounts={mockActivityTypesWithCounts}
          totalTasks={8}
        />
      );

      const developmentButton = screen.getByRole("button", {
        name: /Development/i,
      });
      await user.click(developmentButton);

      await waitFor(() => {
        expect(developmentButton).toHaveClass("bg-accent");
      });
    });

    it("should reset filter when 'All' is clicked", async () => {
      (getTasksList as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
        total: 0,
      });

      render(
        <TasksPageClient
          activityTypes={mockActivityTypes}
          activityTypesWithCounts={mockActivityTypesWithCounts}
          totalTasks={8}
        />
      );

      // First click on a filter
      const developmentButton = screen.getByRole("button", {
        name: /Development/i,
      });
      await user.click(developmentButton);

      await waitFor(() => {
        expect(developmentButton).toHaveClass("bg-accent");
      });

      // Then click on All
      const allButton = screen.getByRole("button", { name: /All/i });
      await user.click(allButton);

      await waitFor(() => {
        expect(allButton).toHaveClass("bg-accent");
      });
    });

    it("should apply different filters sequentially", async () => {
      (getTasksList as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
        total: 0,
      });

      render(
        <TasksPageClient
          activityTypes={mockActivityTypes}
          activityTypesWithCounts={mockActivityTypesWithCounts}
          totalTasks={8}
        />
      );

      const developmentButton = screen.getByRole("button", {
        name: /Development/i,
      });
      await user.click(developmentButton);

      await waitFor(() => {
        expect(developmentButton).toHaveClass("bg-accent");
      });

      const testingButton = screen.getByRole("button", { name: /Testing/i });
      await user.click(testingButton);

      await waitFor(() => {
        expect(testingButton).toHaveClass("bg-accent");
      });
    });
  });

  describe("Empty States", () => {
    it("should handle empty activity types list", () => {
      render(
        <TasksPageClient
          activityTypes={[]}
          activityTypesWithCounts={[]}
          totalTasks={0}
        />
      );

      expect(screen.getByText("Activity Types")).toBeInTheDocument();
      expect(screen.getByText("My Tasks")).toBeInTheDocument();
    });

    it("should show 0 total tasks when no tasks exist", () => {
      render(
        <TasksPageClient
          activityTypes={mockActivityTypes}
          activityTypesWithCounts={mockActivityTypesWithCounts.map((type) => ({
            ...type,
            taskCount: 0,
          }))}
          totalTasks={0}
        />
      );

      const zeroElements = screen.queryAllByText("0");
      expect(zeroElements.length).toBeGreaterThan(0);
    });
  });

  describe("Layout", () => {
    it("should render with correct layout structure", () => {
      const { container } = render(
        <TasksPageClient
          activityTypes={mockActivityTypes}
          activityTypesWithCounts={mockActivityTypesWithCounts}
          totalTasks={8}
        />
      );

      // Check if main container has correct classes
      const mainContainer = container.querySelector(".col-span-3.flex.h-full");
      expect(mainContainer).toBeInTheDocument();
    });

    it("should render sidebar with correct styling", () => {
      const { container } = render(
        <TasksPageClient
          activityTypes={mockActivityTypes}
          activityTypesWithCounts={mockActivityTypesWithCounts}
          totalTasks={8}
        />
      );

      const sidebar = container.querySelector(".w-48.border-r.py-4");
      expect(sidebar).toBeInTheDocument();
    });

    it("should render container with flex-1 class", () => {
      const { container } = render(
        <TasksPageClient
          activityTypes={mockActivityTypes}
          activityTypesWithCounts={mockActivityTypesWithCounts}
          totalTasks={8}
        />
      );

      const tasksContainer = container.querySelector(".flex-1");
      expect(tasksContainer).toBeInTheDocument();
    });
  });

  describe("Filter Synchronization", () => {
    it("should pass filter to TasksContainer", async () => {
      (getTasksList as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
        total: 0,
      });

      render(
        <TasksPageClient
          activityTypes={mockActivityTypes}
          activityTypesWithCounts={mockActivityTypesWithCounts}
          totalTasks={8}
        />
      );

      const developmentButton = screen.getByRole("button", {
        name: /Development/i,
      });
      await user.click(developmentButton);

      // Wait for the filter to be applied
      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(
          1,
          10,
          "type-1",
          expect.any(Array)
        );
      });
    });

    it("should clear filter when All is selected", async () => {
      (getTasksList as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
        total: 0,
      });

      render(
        <TasksPageClient
          activityTypes={mockActivityTypes}
          activityTypesWithCounts={mockActivityTypesWithCounts}
          totalTasks={8}
        />
      );

      // First select a filter
      const developmentButton = screen.getByRole("button", {
        name: /Development/i,
      });
      await user.click(developmentButton);

      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(
          1,
          10,
          "type-1",
          expect.any(Array)
        );
      });

      // Clear mock calls
      (getTasksList as jest.Mock).mockClear();

      // Then click All
      const allButton = screen.getByRole("button", { name: /All/i });
      await user.click(allButton);

      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(
          1,
          10,
          undefined,
          expect.any(Array)
        );
      });
    });
  });

  describe("Multiple Activity Types", () => {
    it("should render many activity types correctly", () => {
      const manyActivityTypes = [
        {
          id: "1",
          label: "Development",
          value: "development",
          taskCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          label: "Testing",
          value: "testing",
          taskCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "3",
          label: "Code Review",
          value: "code-review",
          taskCount: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "4",
          label: "Documentation",
          value: "documentation",
          taskCount: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "5",
          label: "Bug Fixing",
          value: "bug-fixing",
          taskCount: 7,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      render(
        <TasksPageClient
          activityTypes={manyActivityTypes}
          activityTypesWithCounts={manyActivityTypes}
          totalTasks={27}
        />
      );

      expect(screen.getByText("Development")).toBeInTheDocument();
      expect(screen.getByText("Testing")).toBeInTheDocument();
      expect(screen.getByText("Code Review")).toBeInTheDocument();
      expect(screen.getByText("Documentation")).toBeInTheDocument();
      expect(screen.getByText("Bug Fixing")).toBeInTheDocument();
      expect(screen.getByText("27")).toBeInTheDocument();
    });

    it("should handle switching between multiple filters", async () => {
      const manyActivityTypes = [
        {
          id: "1",
          label: "Development",
          value: "development",
          taskCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          label: "Testing",
          value: "testing",
          taskCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "3",
          label: "Code Review",
          value: "code-review",
          taskCount: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (getTasksList as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
        total: 0,
      });

      render(
        <TasksPageClient
          activityTypes={manyActivityTypes}
          activityTypesWithCounts={manyActivityTypes}
          totalTasks={18}
        />
      );

      const developmentButton = screen.getByRole("button", {
        name: /Development/i,
      });
      await user.click(developmentButton);

      await waitFor(() => {
        expect(developmentButton).toHaveClass("bg-accent");
      });

      const testingButton = screen.getByRole("button", { name: /Testing/i });
      await user.click(testingButton);

      await waitFor(() => {
        expect(testingButton).toHaveClass("bg-accent");
      });

      const codeReviewButton = screen.getByRole("button", {
        name: /Code Review/i,
      });
      await user.click(codeReviewButton);

      await waitFor(() => {
        expect(codeReviewButton).toHaveClass("bg-accent");
      });
    });
  });
});
