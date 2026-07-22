import JobTitlesContainer from "@/components/admin/JobTitlesContainer";
import { screen, render, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getJobTitleList, deleteJobTitleById } from "@/actions/jobtitle.actions";

vi.mock("@/actions/jobtitle.actions", () => ({
  getJobTitleList: vi.fn(),
  deleteJobTitleById: vi.fn(),
}));

let intersectionCallback: IntersectionObserverCallback | undefined;
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

describe("JobTitlesContainer Search Functionality", () => {
  const mockTitles = [
    { id: "1", label: "Software Engineer", value: "software engineer", createdBy: "user-1" },
    { id: "2", label: "Product Manager", value: "product manager", createdBy: "user-1" },
  ];

  const user = userEvent.setup({ delay: null });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    intersectionCallback = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Search Input", () => {
    it("should render search input with placeholder", async () => {
      (getJobTitleList as any).mockResolvedValue({
        data: mockTitles,
        total: 2,
      });

      render(<JobTitlesContainer />);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search job titles..."),
        ).toBeInTheDocument();
      });
    });

    it("should debounce search input for 300ms", async () => {
      (getJobTitleList as any).mockResolvedValue({
        data: mockTitles,
        total: 2,
      });

      render(<JobTitlesContainer />);

      await waitFor(() => {
        expect(getJobTitleList).toHaveBeenCalledTimes(1);
      });

      const searchInput = screen.getByPlaceholderText("Search job titles...");

      await act(async () => {
        await user.type(searchInput, "P");
      });

      expect(getJobTitleList).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getJobTitleList).toHaveBeenCalledTimes(2);
      });
    });

    it("should call getJobTitleList with search term after debounce", async () => {
      (getJobTitleList as any).mockResolvedValue({
        data: mockTitles,
        total: 2,
      });

      render(<JobTitlesContainer />);

      await waitFor(() => {
        expect(getJobTitleList).toHaveBeenCalledTimes(1);
      });

      const searchInput = screen.getByPlaceholderText("Search job titles...");

      await act(async () => {
        await user.type(searchInput, "Product");
      });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getJobTitleList).toHaveBeenCalledWith(
          1,
          25,
          "applied",
          "Product",
        );
      });
    });

    it("should not trigger search on initial mount with empty search", async () => {
      (getJobTitleList as any).mockResolvedValue({
        data: mockTitles,
        total: 2,
      });

      render(<JobTitlesContainer />);

      await waitFor(() => {
        expect(getJobTitleList).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(getJobTitleList).toHaveBeenCalledTimes(1);
      expect(getJobTitleList).toHaveBeenCalledWith(1, 25, "applied", undefined);
    });

    it("should display filtered job titles after search", async () => {
      (getJobTitleList as any)
        .mockResolvedValueOnce({ data: mockTitles, total: 2 })
        .mockResolvedValueOnce({ data: [mockTitles[1]], total: 1 });

      render(<JobTitlesContainer />);

      await waitFor(() => {
        expect(screen.getByText("Software Engineer")).toBeInTheDocument();
        expect(screen.getByText("Product Manager")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search job titles...");
      await act(async () => {
        await user.type(searchInput, "Product");
      });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText("Product Manager")).toBeInTheDocument();
        expect(
          screen.queryByText("Software Engineer"),
        ).not.toBeInTheDocument();
      });
    });

    it("should preserve search term when loading more job titles", async () => {
      (getJobTitleList as any)
        .mockResolvedValueOnce({ data: mockTitles, total: 5 })
        .mockResolvedValueOnce({ data: mockTitles, total: 5 })
        .mockResolvedValueOnce({
          data: [
            {
              id: "3",
              label: "Designer",
              value: "designer",
              createdBy: "user-1",
            },
          ],
          total: 5,
        });

      render(<JobTitlesContainer />);

      await waitFor(() => {
        expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search job titles...");
      await act(async () => {
        await user.type(searchInput, "Engineer");
      });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getJobTitleList).toHaveBeenCalledWith(
          1,
          25,
          "applied",
          "Engineer",
        );
      });

      await act(async () => {
        intersectionCallback!(
          [{ isIntersecting: true }] as IntersectionObserverEntry[],
          {} as IntersectionObserver,
        );
      });

      await waitFor(() => {
        expect(getJobTitleList).toHaveBeenCalledWith(
          2,
          25,
          "applied",
          "Engineer",
        );
      });
    });
  });

  describe("Infinite Scroll", () => {
    it("should load and append more job titles when sentinel becomes visible", async () => {
      (getJobTitleList as any)
        .mockResolvedValueOnce({ data: mockTitles, total: 4 })
        .mockResolvedValueOnce({
          data: [
            {
              id: "3",
              label: "Designer",
              value: "designer",
              createdBy: "user-1",
            },
          ],
          total: 4,
        });

      render(<JobTitlesContainer />);

      await waitFor(() => {
        expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      });

      await act(async () => {
        intersectionCallback!(
          [{ isIntersecting: true }] as IntersectionObserverEntry[],
          {} as IntersectionObserver,
        );
      });

      await waitFor(() => {
        expect(getJobTitleList).toHaveBeenCalledWith(2, 25, "applied", undefined);
        expect(screen.getByText("Designer")).toBeInTheDocument();
        expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      });
    });

    it("should not fetch more job titles once all are loaded", async () => {
      (getJobTitleList as any).mockResolvedValue({
        data: mockTitles,
        total: 2,
      });

      render(<JobTitlesContainer />);

      await waitFor(() => {
        expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      });

      await act(async () => {
        intersectionCallback?.(
          [{ isIntersecting: true }] as IntersectionObserverEntry[],
          {} as IntersectionObserver,
        );
      });

      expect(getJobTitleList).toHaveBeenCalledTimes(1);
    });
  });
});
