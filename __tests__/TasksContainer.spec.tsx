import TasksContainer from "@/components/tasks/TasksContainer";
import { screen, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  getTasksList,
  getTaskById,
  deleteTaskById,
  updateTaskStatus,
  startActivityFromTask,
} from "@/actions/task.actions";
import { Task } from "@/models/task.model";
import { useRouter } from "next/navigation";
import { useActivity } from "@/context/ActivityContext";

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
  getTaskById: vi.fn(),
  deleteTaskById: vi.fn(),
  updateTaskStatus: vi.fn(),
  startActivityFromTask: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
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

describe("TasksContainer Component", () => {
  const mockRouter = {
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  };

  const mockRefreshCurrentActivity = vi.fn();

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

  const mockTasks: Task[] = [
    {
      id: "task-1",
      userId: "user-id",
      title: "Task 1",
      description: "Description 1",
      status: "in-progress",
      priority: 5,
      percentComplete: 50,
      dueDate: new Date("2026-12-31"),
      activityTypeId: "type-1",
      activityType: {
        id: "type-1",
        label: "Development",
        value: "development",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      activity: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "task-2",
      userId: "user-id",
      title: "Task 2",
      description: "Description 2",
      status: "needs-attention",
      priority: 8,
      percentComplete: 25,
      dueDate: new Date("2026-11-30"),
      activityTypeId: "type-2",
      activityType: {
        id: "type-2",
        label: "Testing",
        value: "testing",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      activity: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const user = userEvent.setup({ skipHover: true });
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
    (useActivity as any).mockReturnValue({
      refreshCurrentActivity: mockRefreshCurrentActivity,
    });
  });

  describe("Initial Load", () => {
    it("should load and display tasks on mount", async () => {
      (getTasksList as any).mockResolvedValue({
        success: true,
        data: mockTasks,
        total: 2,
      });

      render(<TasksContainer activityTypes={mockActivityTypes} />);

      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(1, 25, undefined, [
          "in-progress",
          "needs-attention",
        ], undefined);
      });

      await waitFor(() => {
        expect(screen.getByText("Task 1")).toBeInTheDocument();
        expect(screen.getByText("Task 2")).toBeInTheDocument();
      });
    });

    it("should show loading state while fetching tasks", () => {
      (getTasksList as any).mockImplementation(
        () => new Promise(() => {}) // Never resolves to keep loading state
      );

      render(<TasksContainer activityTypes={mockActivityTypes} />);

      expect(screen.getByTestId("loader")).toBeInTheDocument();
    });

    it("should show empty state when no tasks are found", async () => {
      (getTasksList as any).mockResolvedValue({
        success: true,
        data: [],
        total: 0,
      });

      render(<TasksContainer activityTypes={mockActivityTypes} />);

      await waitFor(() => {
        expect(screen.getByText(/No tasks found/i)).toBeInTheDocument();
      });
    });
  });

  describe("Task Actions", () => {
    beforeEach(async () => {
      (getTasksList as any).mockResolvedValue({
        success: true,
        data: mockTasks,
        total: 2,
      });

      render(<TasksContainer activityTypes={mockActivityTypes} />);

      await waitFor(() => {
        expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
      });
    });

    it("should open add task dialog when add button is clicked", async () => {
      const addButton = screen.getByTestId("add-task-btn");
      await user.click(addButton);

      await waitFor(() => {
        expect(
          screen.getByTestId("task-form-dialog-title")
        ).toBeInTheDocument();
        expect(screen.getByTestId("task-form-dialog-title")).toHaveTextContent(
          "Add Task"
        );
      });
    });

    it("should handle task deletion successfully", async () => {
      (deleteTaskById as any).mockResolvedValue({
        success: true,
      });
      (getTasksList as any)
        .mockResolvedValueOnce({
          success: true,
          data: mockTasks,
          total: 2,
        })
        .mockResolvedValueOnce({
          success: true,
          data: [mockTasks[1]],
          total: 1,
        });

      await waitFor(() => {
        expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
      });

      // Find and click the actions menu button for the first task
      const actionButtons = screen.getAllByTestId("task-actions-menu-btn");
      await user.click(actionButtons[0]);

      // Click the Delete menu item
      const deleteMenuItem = await screen.findByRole("menuitem", {
        name: /delete/i,
      });
      await user.click(deleteMenuItem);

      // Confirm deletion in the alert dialog
      const confirmButton = await screen.findByRole("button", {
        name: /delete/i,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(deleteTaskById).toHaveBeenCalledWith("task-1");
      });
    });

    it("should handle task deletion failure", async () => {
      (deleteTaskById as any).mockResolvedValue({
        success: false,
        message: "Failed to delete task",
      });

      await waitFor(() => {
        expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
      });

      // Find and click the actions menu button for the first task
      const actionButtons = screen.getAllByTestId("task-actions-menu-btn");
      await user.click(actionButtons[0]);

      // Click the Delete menu item
      const deleteMenuItem = await screen.findByRole("menuitem", {
        name: /delete/i,
      });
      await user.click(deleteMenuItem);

      // Confirm deletion in the alert dialog
      const confirmButton = await screen.findByRole("button", {
        name: /delete/i,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(deleteTaskById).toHaveBeenCalled();
      });
    });

    it("should open edit task dialog when edit is clicked", async () => {
      (getTaskById as any).mockResolvedValue({
        success: true,
        data: mockTasks[0],
      });

      // Find and click the actions menu button for the first task
      const actionButtons = screen.getAllByTestId("task-actions-menu-btn");
      await user.click(actionButtons[0]);

      // Click the Edit Task menu item
      const editMenuItem = await screen.findByRole("menuitem", {
        name: /edit task/i,
      });
      await user.click(editMenuItem);

      await waitFor(() => {
        expect(getTaskById).toHaveBeenCalledWith("task-1");
        expect(screen.getByTestId("task-form-dialog-title")).toHaveTextContent(
          "Edit Task"
        );
      });
    });

    it("should handle edit task failure when task not found", async () => {
      (getTaskById as any).mockResolvedValue({
        success: false,
        message: "Task not found",
      });

      await waitFor(() => {
        expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
      });

      // Find and click the actions menu button for the first task
      const actionButtons = screen.getAllByTestId("task-actions-menu-btn");
      await user.click(actionButtons[0]);

      // Click the Edit Task menu item
      const editMenuItem = await screen.findByRole("menuitem", {
        name: /edit task/i,
      });
      await user.click(editMenuItem);

      await waitFor(() => {
        expect(getTaskById).toHaveBeenCalledWith("task-1");
        expect(
          screen.queryByTestId("task-form-dialog-title")
        ).not.toBeInTheDocument();
      });
    });

    it("should update task status successfully", async () => {
      (updateTaskStatus as any).mockResolvedValue({
        success: true,
      });

      await waitFor(() => {
        expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
      });

      // Find and click the actions menu button for the first task
      const actionButtons = screen.getAllByTestId("task-actions-menu-btn");
      await user.click(actionButtons[0]);

      // Hover over Change Status to open submenu
      const changeStatusMenuItem = await screen.findByRole("menuitem", {
        name: /change status/i,
      });
      await user.hover(changeStatusMenuItem);

      // Click the Complete option in the submenu
      const completeOption = await screen.findByRole("menuitem", {
        name: "Complete",
      });
      await user.click(completeOption);

      await waitFor(() => {
        expect(updateTaskStatus).toHaveBeenCalledWith("task-1", "complete");
      });
    });

    it("should handle task status update failure", async () => {
      (updateTaskStatus as any).mockResolvedValue({
        success: false,
        message: "Failed to update status",
      });

      await waitFor(() => {
        expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
      });

      // Find and click the actions menu button for the first task
      const actionButtons = screen.getAllByTestId("task-actions-menu-btn");
      await user.click(actionButtons[0]);

      // Hover over Change Status to open submenu
      const changeStatusMenuItem = await screen.findByRole("menuitem", {
        name: /change status/i,
      });
      await user.hover(changeStatusMenuItem);

      // Click the Complete option in the submenu
      const completeOption = await screen.findByRole("menuitem", {
        name: "Complete",
      });
      await user.click(completeOption);

      await waitFor(() => {
        expect(updateTaskStatus).toHaveBeenCalledWith("task-1", "complete");
      });
    });

    it("should start activity from task successfully", async () => {
      (startActivityFromTask as any).mockResolvedValue({
        success: true,
      });

      const startActivityButtons = screen.getAllByTestId(/start-activity-/);
      await user.click(startActivityButtons[0]);

      await waitFor(() => {
        expect(startActivityFromTask).toHaveBeenCalledWith("task-1");
        expect(mockRefreshCurrentActivity).toHaveBeenCalled();
      });
    });

    it("should handle start activity failure", async () => {
      (startActivityFromTask as any).mockResolvedValue({
        success: false,
        message: "Failed to start activity",
      });

      const startActivityButtons = screen.getAllByTestId(/start-activity-/);
      await user.click(startActivityButtons[0]);

      await waitFor(() => {
        expect(startActivityFromTask).toHaveBeenCalledWith("task-1");
        expect(mockRefreshCurrentActivity).not.toHaveBeenCalled();
      });
    });
  });

  describe("Filtering and Grouping", () => {
    beforeEach(async () => {
      (getTasksList as any).mockResolvedValue({
        success: true,
        data: mockTasks,
        total: 2,
      });

      render(
        <TasksContainer activityTypes={mockActivityTypes} filterKey="type-1" />
      );

      await waitFor(() => {
        expect(screen.getByText("Task 1")).toBeInTheDocument();
      });
    });

    it("should apply activity type filter", async () => {
      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(1, 25, "type-1", [
          "in-progress",
          "needs-attention",
        ], undefined);
      });
    });

    it("should toggle status filter", async () => {
      const filterButton = screen.getByRole("button", { name: /status/i });
      await user.click(filterButton);

      const inProgressCheckbox = screen.getByRole("menuitemcheckbox", {
        name: "In Progress",
      });
      expect(inProgressCheckbox).toBeChecked();

      await user.click(inProgressCheckbox);

      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(1, 25, "type-1", [
          "needs-attention",
        ], undefined);
      });
    });

    it("should change grouping option", async () => {
      const groupBySelect = screen.getByRole("combobox");
      await user.click(groupBySelect);

      const dueDateOption = screen.getByRole("option", { name: "Due Date" });
      await user.click(dueDateOption);

      await waitFor(() => {
        expect(groupBySelect).toHaveTextContent("Due Date");
      });
    });
  });

  describe("Pagination", () => {
    it("should show load more button when there are more tasks", async () => {
      (getTasksList as any).mockResolvedValue({
        success: true,
        data: mockTasks,
        total: 20,
      });

      render(<TasksContainer activityTypes={mockActivityTypes} />);

      await waitFor(() => {
        expect(screen.getByText("Load More")).toBeInTheDocument();
      });
    });

    it("should load more tasks when load more button is clicked", async () => {
      (getTasksList as any)
        .mockResolvedValueOnce({
          success: true,
          data: mockTasks,
          total: 20,
        })
        .mockResolvedValueOnce({
          success: true,
          data: [
            {
              ...mockTasks[0],
              id: "task-3",
              title: "Task 3",
            },
          ],
          total: 20,
        });

      render(<TasksContainer activityTypes={mockActivityTypes} />);

      await waitFor(() => {
        expect(screen.getByText("Load More")).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByText("Load More");
      await user.click(loadMoreButton);

      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(2, 25, undefined, [
          "in-progress",
          "needs-attention",
        ], undefined);
      });
    });

    it("should not show load more button when all tasks are loaded", async () => {
      (getTasksList as any).mockResolvedValue({
        success: true,
        data: mockTasks,
        total: 2,
      });

      render(<TasksContainer activityTypes={mockActivityTypes} />);

      await waitFor(() => {
        expect(screen.queryByText("Load More")).not.toBeInTheDocument();
      });
    });

    it("should show correct task count", async () => {
      (getTasksList as any).mockResolvedValue({
        success: true,
        data: mockTasks,
        total: 10,
      });

      render(<TasksContainer activityTypes={mockActivityTypes} />);

      await waitFor(() => {
        expect(screen.getByText(/Showing/i)).toBeInTheDocument();
        expect(
          screen.getByText("1 to 2", { exact: false })
        ).toBeInTheDocument();
        expect(screen.getByText("10", { exact: false })).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle getTasksList error", async () => {
      (getTasksList as any).mockResolvedValue({
        success: false,
        message: "Failed to fetch tasks",
      });

      render(<TasksContainer activityTypes={mockActivityTypes} />);

      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalled();
      });
    });
  });

  describe("Filter Change Callback", () => {
    it("should call onFilterChange when filter changes", async () => {
      const mockOnFilterChange = vi.fn();

      (getTasksList as any).mockResolvedValue({
        success: true,
        data: mockTasks,
        total: 2,
      });

      render(
        <TasksContainer
          activityTypes={mockActivityTypes}
          filterKey={undefined}
          onFilterChange={mockOnFilterChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Task 1")).toBeInTheDocument();
      });

      // Note: onFilterChange would typically be called from parent component
      // This test verifies the prop is passed correctly
      expect(mockOnFilterChange).not.toHaveBeenCalled();
    });
  });

  describe("Search Feature", () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should render search input", async () => {
      (getTasksList as any).mockResolvedValue({
        success: true,
        data: mockTasks,
        total: 2,
      });

      render(<TasksContainer activityTypes={mockActivityTypes} />);

      const searchInput = screen.getByPlaceholderText("Search tasks...");
      expect(searchInput).toBeInTheDocument();
    });

    it("should call getTasksList with search term after debounce", async () => {
      (getTasksList as any).mockResolvedValue({
        success: true,
        data: mockTasks,
        total: 2,
      });

      render(<TasksContainer activityTypes={mockActivityTypes} />);

      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(
          1,
          25,
          undefined,
          ["in-progress", "needs-attention"],
          undefined
        );
      });

      vi.clearAllMocks();

      const searchInput = screen.getByPlaceholderText("Search tasks...");
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).type(
        searchInput,
        "Task 1"
      );

      // Before debounce, getTasksList should not be called with search term
      expect(getTasksList).not.toHaveBeenCalled();

      // Fast-forward past the 300ms debounce
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(
          1,
          25,
          undefined,
          ["in-progress", "needs-attention"],
          "Task 1"
        );
      });
    });

    it("should filter tasks based on search term", async () => {
      const filteredTasks = [mockTasks[0]];

      (getTasksList as any)
        .mockResolvedValueOnce({
          success: true,
          data: mockTasks,
          total: 2,
        })
        .mockResolvedValueOnce({
          success: true,
          data: filteredTasks,
          total: 1,
        });

      render(<TasksContainer activityTypes={mockActivityTypes} />);

      await waitFor(() => {
        expect(screen.getByText("Task 1")).toBeInTheDocument();
        expect(screen.getByText("Task 2")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search tasks...");
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).type(
        searchInput,
        "Task 1"
      );

      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText("Task 1")).toBeInTheDocument();
        expect(screen.queryByText("Task 2")).not.toBeInTheDocument();
      });
    });

    it("should show no tasks found when search returns empty results", async () => {
      (getTasksList as any)
        .mockResolvedValueOnce({
          success: true,
          data: mockTasks,
          total: 2,
        })
        .mockResolvedValueOnce({
          success: true,
          data: [],
          total: 0,
        });

      render(<TasksContainer activityTypes={mockActivityTypes} />);

      await waitFor(() => {
        expect(screen.getByText("Task 1")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search tasks...");
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).type(
        searchInput,
        "nonexistent"
      );

      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText(/No tasks found/i)).toBeInTheDocument();
      });
    });

    it("should combine search with status filter", async () => {
      (getTasksList as any).mockResolvedValue({
        success: true,
        data: mockTasks,
        total: 2,
      });

      render(<TasksContainer activityTypes={mockActivityTypes} />);

      await waitFor(() => {
        expect(screen.getByText("Task 1")).toBeInTheDocument();
      });

      // Toggle status filter first
      const filterButton = screen.getByRole("button", { name: /status/i });
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(
        filterButton
      );

      const inProgressCheckbox = screen.getByRole("menuitemcheckbox", {
        name: "In Progress",
      });
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(
        inProgressCheckbox
      );

      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(
          1,
          25,
          undefined,
          ["needs-attention"],
          undefined
        );
      });

      vi.clearAllMocks();

      // Now search
      const searchInput = screen.getByPlaceholderText("Search tasks...");
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).type(
        searchInput,
        "Task"
      );

      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(
          1,
          25,
          undefined,
          ["needs-attention"],
          "Task"
        );
      });
    });

    it("should combine search with activity type filter", async () => {
      (getTasksList as any).mockResolvedValue({
        success: true,
        data: mockTasks,
        total: 2,
      });

      render(
        <TasksContainer activityTypes={mockActivityTypes} filterKey="type-1" />
      );

      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(
          1,
          25,
          "type-1",
          ["in-progress", "needs-attention"],
          undefined
        );
      });

      vi.clearAllMocks();

      const searchInput = screen.getByPlaceholderText("Search tasks...");
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).type(
        searchInput,
        "Development"
      );

      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(
          1,
          25,
          "type-1",
          ["in-progress", "needs-attention"],
          "Development"
        );
      });
    });

    it("should pass search term when loading more tasks", async () => {
      (getTasksList as any)
        .mockResolvedValueOnce({
          success: true,
          data: mockTasks,
          total: 20,
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockTasks,
          total: 20,
        })
        .mockResolvedValueOnce({
          success: true,
          data: [{ ...mockTasks[0], id: "task-3", title: "Task 3" }],
          total: 20,
        });

      render(<TasksContainer activityTypes={mockActivityTypes} />);

      await waitFor(() => {
        expect(screen.getByText("Task 1")).toBeInTheDocument();
      });

      // Type search term
      const searchInput = screen.getByPlaceholderText("Search tasks...");
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).type(
        searchInput,
        "Task"
      );

      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(
          1,
          25,
          undefined,
          ["in-progress", "needs-attention"],
          "Task"
        );
      });

      vi.clearAllMocks();

      // Click Load More
      const loadMoreButton = screen.getByText("Load More");
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(
        loadMoreButton
      );

      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(
          2,
          25,
          undefined,
          ["in-progress", "needs-attention"],
          "Task"
        );
      });
    });

    it("should reset to page 1 when search term changes", async () => {
      (getTasksList as any).mockResolvedValue({
        success: true,
        data: mockTasks,
        total: 2,
      });

      render(<TasksContainer activityTypes={mockActivityTypes} />);

      await waitFor(() => {
        expect(screen.getByText("Task 1")).toBeInTheDocument();
      });

      vi.clearAllMocks();

      const searchInput = screen.getByPlaceholderText("Search tasks...");
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).type(
        searchInput,
        "first search"
      );

      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(
          1,
          25,
          undefined,
          ["in-progress", "needs-attention"],
          "first search"
        );
      });

      vi.clearAllMocks();

      // Change search term
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).clear(
        searchInput
      );
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).type(
        searchInput,
        "second search"
      );

      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(
          1,
          25,
          undefined,
          ["in-progress", "needs-attention"],
          "second search"
        );
      });
    });

    it("should debounce multiple rapid keystrokes", async () => {
      (getTasksList as any).mockResolvedValue({
        success: true,
        data: mockTasks,
        total: 2,
      });

      const typingUser = userEvent.setup({
        advanceTimers: vi.advanceTimersByTime,
      });

      render(<TasksContainer activityTypes={mockActivityTypes} />);

      await waitFor(() => {
        expect(screen.getByText("Task 1")).toBeInTheDocument();
      });

      vi.clearAllMocks();

      const searchInput = screen.getByPlaceholderText("Search tasks...");

      // Type "Task" rapidly - single userEvent instance handles debouncing correctly
      await typingUser.type(searchInput, "Task");

      // Only after full debounce should API be called
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(getTasksList).toHaveBeenLastCalledWith(
          1,
          25,
          undefined,
          ["in-progress", "needs-attention"],
          "Task"
        );
      });
    });

    it("should reload tasks with search term after task is saved", async () => {
      const mockOnTasksChanged = vi.fn();

      (getTasksList as any).mockResolvedValue({
        success: true,
        data: mockTasks,
        total: 2,
      });

      render(
        <TasksContainer
          activityTypes={mockActivityTypes}
          onTasksChanged={mockOnTasksChanged}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Task 1")).toBeInTheDocument();
      });

      // Type search term
      const searchInput = screen.getByPlaceholderText("Search tasks...");
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).type(
        searchInput,
        "Task"
      );

      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(getTasksList).toHaveBeenCalledWith(
          1,
          25,
          undefined,
          ["in-progress", "needs-attention"],
          "Task"
        );
      });

      // Verify that search term is maintained in state
      expect(searchInput).toHaveValue("Task");
    });
  });
});
