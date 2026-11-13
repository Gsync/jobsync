import JobLocationsContainer from "@/components/admin/JobLocationsContainer";
import { screen, render, waitFor, act } from "@testing-library/react";
import { getJobLocationsList } from "@/actions/jobLocation.actions";

vi.mock("@/actions/jobLocation.actions", () => ({
  getJobLocationsList: vi.fn(),
  deleteJobLocationById: vi.fn(),
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

describe("JobLocationsContainer", () => {
  const mockLocations = [
    { id: "1", label: "Remote", value: "remote", createdBy: "user-1" },
    { id: "2", label: "New York", value: "new-york", createdBy: "user-1" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    intersectionCallback = undefined;
  });

  it("should load and display job locations on mount", async () => {
    (getJobLocationsList as any).mockResolvedValue({
      data: mockLocations,
      total: 2,
    });

    render(<JobLocationsContainer />);

    await waitFor(() => {
      expect(screen.getByText("Remote")).toBeInTheDocument();
      expect(screen.getByText("New York")).toBeInTheDocument();
    });

    expect(getJobLocationsList).toHaveBeenCalledWith(1, 25, "applied");
  });

  describe("Infinite Scroll", () => {
    it("should load and append more job locations when sentinel becomes visible", async () => {
      (getJobLocationsList as any)
        .mockResolvedValueOnce({ data: mockLocations, total: 4 })
        .mockResolvedValueOnce({
          data: [
            { id: "3", label: "Austin", value: "austin", createdBy: "user-1" },
          ],
          total: 4,
        });

      render(<JobLocationsContainer />);

      await waitFor(() => {
        expect(screen.getByText("Remote")).toBeInTheDocument();
      });

      await act(async () => {
        intersectionCallback!(
          [{ isIntersecting: true }] as IntersectionObserverEntry[],
          {} as IntersectionObserver,
        );
      });

      await waitFor(() => {
        expect(getJobLocationsList).toHaveBeenCalledWith(2, 25, "applied");
        expect(screen.getByText("Austin")).toBeInTheDocument();
        expect(screen.getByText("Remote")).toBeInTheDocument();
      });
    });

    it("should not fetch more job locations once all are loaded", async () => {
      (getJobLocationsList as any).mockResolvedValue({
        data: mockLocations,
        total: 2,
      });

      render(<JobLocationsContainer />);

      await waitFor(() => {
        expect(screen.getByText("Remote")).toBeInTheDocument();
      });

      await act(async () => {
        intersectionCallback?.(
          [{ isIntersecting: true }] as IntersectionObserverEntry[],
          {} as IntersectionObserver,
        );
      });

      expect(getJobLocationsList).toHaveBeenCalledTimes(1);
    });
  });
});
