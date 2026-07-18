import CompaniesContainer from "@/components/admin/CompaniesContainer";
import { screen, render, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getCompanyList, getCompanyById } from "@/actions/company.actions";

vi.mock("@/actions/company.actions", () => ({
  getCompanyList: vi.fn(),
  getCompanyById: vi.fn(),
  deleteCompanyById: vi.fn(),
  addCompany: vi.fn(),
  updateCompany: vi.fn(),
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
        expect(getCompanyList).toHaveBeenCalledWith(1, 25, "applied", "Amazon");
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
      expect(getCompanyList).toHaveBeenCalledWith(1, 25, "applied", undefined);
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
        expect(getCompanyList).toHaveBeenCalledWith(1, 25, "applied", "Amazon");
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
      (getCompanyList as any).mockResolvedValue({
        data: mockCompanies,
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
        expect(getCompanyList).toHaveBeenCalledWith(1, 25, "applied", "Amazon");
      });

      await act(async () => {
        intersectionCallback!(
          [{ isIntersecting: true }] as IntersectionObserverEntry[],
          {} as IntersectionObserver,
        );
      });

      await waitFor(() => {
        expect(getCompanyList).toHaveBeenCalledWith(2, 25, "applied", "Amazon");
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
        expect(getCompanyList).toHaveBeenCalledWith(2, 25, "applied", undefined);
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
});
