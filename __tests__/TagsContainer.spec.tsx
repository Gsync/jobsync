import TagsContainer from "@/components/admin/TagsContainer";
import { screen, render, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getTagList, deleteTagById } from "@/actions/tag.actions";

vi.mock("@/actions/tag.actions", () => ({
  getTagList: vi.fn(),
  deleteTagById: vi.fn(),
  createTag: vi.fn(),
}));

describe("TagsContainer Search Functionality", () => {
  const mockTags = [
    {
      id: "1",
      label: "React",
      value: "react",
      createdBy: "user-1",
      _count: { jobs: 1, questions: 0, skills: 0 },
    },
    {
      id: "2",
      label: "Python",
      value: "python",
      createdBy: "user-1",
      _count: { jobs: 0, questions: 1, skills: 0 },
    },
  ];

  const user = userEvent.setup({ delay: null });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Search Input", () => {
    it("should render search input with placeholder", async () => {
      (getTagList as any).mockResolvedValue({ data: mockTags, total: 2 });

      render(<TagsContainer />);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search skills..."),
        ).toBeInTheDocument();
      });
    });

    it("should debounce search input for 300ms", async () => {
      (getTagList as any).mockResolvedValue({ data: mockTags, total: 2 });

      render(<TagsContainer />);

      await waitFor(() => {
        expect(getTagList).toHaveBeenCalledTimes(1);
      });

      const searchInput = screen.getByPlaceholderText("Search skills...");

      await act(async () => {
        await user.type(searchInput, "P");
      });

      expect(getTagList).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getTagList).toHaveBeenCalledTimes(2);
      });
    });

    it("should call getTagList with search term after debounce", async () => {
      (getTagList as any).mockResolvedValue({ data: mockTags, total: 2 });

      render(<TagsContainer />);

      await waitFor(() => {
        expect(getTagList).toHaveBeenCalledTimes(1);
      });

      const searchInput = screen.getByPlaceholderText("Search skills...");

      await act(async () => {
        await user.type(searchInput, "Python");
      });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getTagList).toHaveBeenCalledWith(1, 25, "Python");
      });
    });

    it("should not trigger search on initial mount with empty search", async () => {
      (getTagList as any).mockResolvedValue({ data: mockTags, total: 2 });

      render(<TagsContainer />);

      await waitFor(() => {
        expect(getTagList).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(getTagList).toHaveBeenCalledTimes(1);
      expect(getTagList).toHaveBeenCalledWith(1, 25, undefined);
    });

    it("should display filtered skills after search", async () => {
      (getTagList as any)
        .mockResolvedValueOnce({ data: mockTags, total: 2 })
        .mockResolvedValueOnce({ data: [mockTags[1]], total: 1 });

      render(<TagsContainer />);

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
        expect(screen.getByText("Python")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search skills...");
      await act(async () => {
        await user.type(searchInput, "Python");
      });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText("Python")).toBeInTheDocument();
        expect(screen.queryByText("React")).not.toBeInTheDocument();
      });
    });

    it("should preserve search term when loading more skills", async () => {
      (getTagList as any).mockResolvedValue({ data: mockTags, total: 5 });

      render(<TagsContainer />);

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search skills...");
      await act(async () => {
        await user.type(searchInput, "React");
      });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getTagList).toHaveBeenCalledWith(1, 25, "React");
      });

      const loadMoreButton = await screen.findByRole("button", {
        name: /load more/i,
      });
      await act(async () => {
        await user.click(loadMoreButton);
      });

      await waitFor(() => {
        expect(getTagList).toHaveBeenCalledWith(2, 25, "React");
      });
    });
  });
});
