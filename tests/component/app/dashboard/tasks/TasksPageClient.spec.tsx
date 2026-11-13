import TasksPageClient from "@/app/dashboard/tasks/TasksPageClient";
import { screen, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getTasksList } from "@/actions/task.actions";
import { useRouter, useSearchParams } from "next/navigation";

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

vi.mock("@/actions/task.actions", () => ({
  getTasksList: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: vi.fn().mockReturnValue("/dashboard/tasks"),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
}));

vi.mock("@/context/ActivityContext", () => ({
  useActivity: vi.fn(() => ({
    refreshCurrentActivity: vi.fn(),
  })),
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
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (getTasksList as any).mockResolvedValue({
      success: true,
      data: [],
      total: 0,
    });
    (useSearchParams as any).mockReturnValue(new URLSearchParams());
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
      expect(screen.getByText("Tasks")).toBeInTheDocument();
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
      (getTasksList as any).mockResolvedValue({
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

    it("should apply different filters sequentially", async () => {
      (getTasksList as any).mockResolvedValue({
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
      expect(screen.getByText("Tasks")).toBeInTheDocument();
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

      // Full-width dashboard page rule (src/app/dashboard/CLAUDE.md)
      const mainContainer = container.querySelector(".col-span-3");
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe("Filter Synchronization", () => {
    it("should pass filter to TasksContainer", async () => {
      (getTasksList as any).mockResolvedValue({
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
          25,
          "type-1",
          expect.any(Array),
          undefined,
          "none"
        );
      });
    });

    it("should clear filter when All is selected", async () => {
      (getTasksList as any).mockResolvedValue({
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
          25,
          "type-1",
          expect.any(Array),
          undefined,
          "none"
        );
      });

      // Clear mock calls
      (getTasksList as any).mockClear();

      // Then click All
      const allButton = screen.getByRole("button", { name: /All/i });
      await user.click(allButton);

      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(
          1,
          25,
          undefined,
          expect.any(Array),
          undefined,
          "none"
        );
      });
      expect(allButton).toHaveClass("bg-accent");
    });
  });

  describe("URL Persistence", () => {
    it("should initialize the selected filter from the activityType URL param", () => {
      (useSearchParams as any).mockReturnValue(
        new URLSearchParams("activityType=type-1")
      );

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
      expect(developmentButton).toHaveClass("bg-accent");
    });

    it("should write the selected activity type to the URL", async () => {
      const routerMock = (useRouter as any)();

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
        expect(routerMock.replace).toHaveBeenCalledWith(
          "/dashboard/tasks?activityType=type-1",
          { scroll: false }
        );
      });
    });

    it("should remove the activityType param from the URL when All is clicked", async () => {
      (useSearchParams as any).mockReturnValue(
        new URLSearchParams("activityType=type-1")
      );
      const routerMock = (useRouter as any)();

      render(
        <TasksPageClient
          activityTypes={mockActivityTypes}
          activityTypesWithCounts={mockActivityTypesWithCounts}
          totalTasks={8}
        />
      );

      const allButton = screen.getByRole("button", { name: /All/i });
      await user.click(allButton);

      await waitFor(() => {
        expect(routerMock.replace).toHaveBeenCalledWith("/dashboard/tasks", {
          scroll: false,
        });
      });
    });
  });
});
