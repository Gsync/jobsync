import CompaniesContainer from "@/components/admin/CompaniesContainer";
import { screen, render, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getCompanyList, getCompanyById } from "@/actions/company.actions";
import { searchAtsCompanies } from "@/actions/atsCompany.actions";

const mockPush = vi.fn();
let mockParams = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/dashboard/admin",
  useSearchParams: () => mockParams,
}));

vi.mock("@/actions/company.actions", () => ({
  getCompanyList: vi.fn(),
  getCompanyById: vi.fn(),
  deleteCompanyById: vi.fn(),
  addCompany: vi.fn(),
  updateCompany: vi.fn(),
  watchBoardCompany: vi.fn(),
  setCompanyWatched: vi.fn(),
  getWatchedBoards: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/actions/atsCompany.actions", () => ({
  searchAtsCompanies: vi.fn().mockResolvedValue({
    companies: [{ name: "Anthropic", token: "anthropic" }],
    hasMore: false,
  }),
  getAtsCompanyCount: vi.fn().mockResolvedValue(1860),
  resolveAtsBoard: vi.fn(),
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

describe("CompaniesContainer Search Functionality", () => {
  const mockCompanies = [
    { id: "1", label: "Amazon", value: "amazon", createdBy: "user-1" },
    { id: "2", label: "Google", value: "google", createdBy: "user-1" },
  ];

  const user = userEvent.setup({ delay: null });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    intersectionCallback = undefined;
    mockParams = new URLSearchParams("");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Search Input", () => {
    it("should render search input with placeholder", async () => {
      (getCompanyList as any).mockResolvedValue({
        data: mockCompanies,
        total: 2,
      });

      render(<CompaniesContainer />);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search companies..."),
        ).toBeInTheDocument();
      });
    });

    it("should update search input value when typing", async () => {
      (getCompanyList as any).mockResolvedValue({
        data: mockCompanies,
        total: 2,
      });

      render(<CompaniesContainer />);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search companies..."),
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search companies...");

      await act(async () => {
        await user.type(searchInput, "Amazon");
      });

      expect(searchInput).toHaveValue("Amazon");
    });

    it("should debounce search input for 300ms", async () => {
      (getCompanyList as any).mockResolvedValue({
        data: mockCompanies,
        total: 2,
      });

      render(<CompaniesContainer />);

      await waitFor(() => {
        expect(getCompanyList).toHaveBeenCalledTimes(1);
      });

      const searchInput = screen.getByPlaceholderText("Search companies...");

      await act(async () => {
        await user.type(searchInput, "A");
      });

      // Should not have called getCompanyList yet (debounce not elapsed)
      expect(getCompanyList).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getCompanyList).toHaveBeenCalledTimes(2);
      });
    });

    it("should call getCompanyList with search term after debounce", async () => {
      (getCompanyList as any).mockResolvedValue({
        data: mockCompanies,
        total: 2,
      });

      render(<CompaniesContainer />);

      await waitFor(() => {
        expect(getCompanyList).toHaveBeenCalledTimes(1);
      });

      const searchInput = screen.getByPlaceholderText("Search companies...");

      await act(async () => {
        await user.type(searchInput, "Amazon");
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getCompanyList).toHaveBeenCalledWith(
          1,
          25,
          "applied",
          "Amazon",
          "mine",
        );
      });
    });

    it("should not trigger search on initial mount with empty search", async () => {
      (getCompanyList as any).mockResolvedValue({
        data: mockCompanies,
        total: 2,
      });

      render(<CompaniesContainer />);

      await waitFor(() => {
        expect(getCompanyList).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(getCompanyList).toHaveBeenCalledTimes(1);
      expect(getCompanyList).toHaveBeenCalledWith(
        1,
        25,
        "applied",
        undefined,
        "mine",
      );
    });

    it("should trigger search when clearing search term after searching", async () => {
      (getCompanyList as any).mockResolvedValue({
        data: mockCompanies,
        total: 2,
      });

      render(<CompaniesContainer />);

      await waitFor(() => {
        expect(getCompanyList).toHaveBeenCalledTimes(1);
      });

      const searchInput = screen.getByPlaceholderText("Search companies...");

      await act(async () => {
        await user.type(searchInput, "Amazon");
      });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getCompanyList).toHaveBeenCalledWith(
          1,
          25,
          "applied",
          "Amazon",
          "mine",
        );
      });

      await act(async () => {
        await user.clear(searchInput);
      });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getCompanyList).toHaveBeenLastCalledWith(
          1,
          25,
          "applied",
          undefined,
          "mine",
        );
      });
    });

    it("should display filtered companies after search", async () => {
      (getCompanyList as any)
        .mockResolvedValueOnce({ data: mockCompanies, total: 2 })
        .mockResolvedValueOnce({
          data: [mockCompanies[0]],
          total: 1,
        });

      render(<CompaniesContainer />);

      await waitFor(() => {
        expect(screen.getByText("Amazon")).toBeInTheDocument();
        expect(screen.getByText("Google")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search companies...");
      await act(async () => {
        await user.type(searchInput, "Amazon");
      });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText("Amazon")).toBeInTheDocument();
        expect(screen.queryByText("Google")).not.toBeInTheDocument();
      });
    });

    it("should preserve search term when loading more companies", async () => {
      (getCompanyList as any)
        .mockResolvedValueOnce({ data: mockCompanies, total: 5 })
        .mockResolvedValueOnce({ data: mockCompanies, total: 5 })
        .mockResolvedValueOnce({
          data: [{ id: "3", label: "Meta", value: "meta", createdBy: "user-1" }],
          total: 5,
        });

      render(<CompaniesContainer />);

      await waitFor(() => {
        expect(screen.getByText("Amazon")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search companies...");
      await act(async () => {
        await user.type(searchInput, "Amazon");
      });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getCompanyList).toHaveBeenCalledWith(
          1,
          25,
          "applied",
          "Amazon",
          "mine",
        );
      });

      await act(async () => {
        intersectionCallback!(
          [{ isIntersecting: true }] as IntersectionObserverEntry[],
          {} as IntersectionObserver,
        );
      });

      await waitFor(() => {
        expect(getCompanyList).toHaveBeenCalledWith(
          2,
          25,
          "applied",
          "Amazon",
          "mine",
        );
      });
    });
  });

  describe("Infinite Scroll", () => {
    it("should load and append more companies when sentinel becomes visible", async () => {
      (getCompanyList as any)
        .mockResolvedValueOnce({ data: mockCompanies, total: 4 })
        .mockResolvedValueOnce({
          data: [{ id: "3", label: "Meta", value: "meta", createdBy: "user-1" }],
          total: 4,
        });

      render(<CompaniesContainer />);

      await waitFor(() => {
        expect(screen.getByText("Amazon")).toBeInTheDocument();
      });

      await act(async () => {
        intersectionCallback!(
          [{ isIntersecting: true }] as IntersectionObserverEntry[],
          {} as IntersectionObserver,
        );
      });

      await waitFor(() => {
        expect(getCompanyList).toHaveBeenCalledWith(
          2,
          25,
          "applied",
          undefined,
          "mine",
        );
        expect(screen.getByText("Meta")).toBeInTheDocument();
        expect(screen.getByText("Amazon")).toBeInTheDocument();
      });
    });

    it("should not fetch more companies once all are loaded", async () => {
      (getCompanyList as any).mockResolvedValue({
        data: mockCompanies,
        total: 2,
      });

      render(<CompaniesContainer />);

      await waitFor(() => {
        expect(screen.getByText("Amazon")).toBeInTheDocument();
      });

      await act(async () => {
        intersectionCallback?.(
          [{ isIntersecting: true }] as IntersectionObserverEntry[],
          {} as IntersectionObserver,
        );
      });

      expect(getCompanyList).toHaveBeenCalledTimes(1);
    });
  });

  describe("Scope", () => {
    it("reads the scope from the URL and browses the seed instead of the database", async () => {
      mockParams = new URLSearchParams("scope=board:ashby");
      (getCompanyList as any).mockResolvedValue({ data: [], total: 0 });

      render(<CompaniesContainer />);

      expect(await screen.findByText("Anthropic")).toBeInTheDocument();
      expect(searchAtsCompanies).toHaveBeenCalledWith("ashby", "", 0);
      expect(getCompanyList).not.toHaveBeenCalled();
    });

    it("passes the watchlist scope through to getCompanyList", async () => {
      mockParams = new URLSearchParams("scope=watchlist");
      (getCompanyList as any).mockResolvedValue({ data: [], total: 0 });

      render(<CompaniesContainer />);

      await waitFor(() =>
        expect(getCompanyList).toHaveBeenCalledWith(
          1,
          25,
          "applied",
          undefined,
          "watchlist",
        ),
      );
    });
  });
});
