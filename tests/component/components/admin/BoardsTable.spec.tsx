import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BoardsTable from "@/components/admin/BoardsTable";
import { setCompanyWatched, watchBoardCompany } from "@/actions/company.actions";

vi.mock("@/actions/company.actions", () => ({
  watchBoardCompany: vi.fn(),
  setCompanyWatched: vi.fn(),
}));

describe("BoardsTable", () => {
  const rows = [
    { name: "Anthropic", token: "anthropic" },
    { name: "Ramp", token: "ramp" },
  ];
  const user = userEvent.setup();

  const renderTable = (overrides = {}) =>
    render(
      <BoardsTable
        provider="ashby"
        rows={rows}
        watchedMap={new Map([["ramp", "company-ramp"]])}
        onWatched={vi.fn()}
        onUnwatched={vi.fn()}
        onNeedsMerge={vi.fn()}
        {...overrides}
      />,
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks a row as watched by token, not by name", () => {
    renderTable();
    expect(
      screen.getByRole("button", { name: /watch anthropic/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /unwatch ramp/i }),
    ).toBeInTheDocument();
  });

  it("links each row to its public board", () => {
    renderTable();
    const link = screen.getByRole("link", { name: /open anthropic job board/i });
    expect(link).toHaveAttribute("href", "https://jobs.ashbyhq.com/anthropic");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("marks a row watched optimistically on success", async () => {
    const onWatched = vi.fn();
    (watchBoardCompany as any).mockResolvedValue({
      success: true,
      data: { companyId: "new-id", merged: false },
    });
    renderTable({ onWatched });

    await user.click(screen.getByRole("button", { name: /watch anthropic/i }));

    await waitFor(() =>
      expect(onWatched).toHaveBeenCalledWith("anthropic", "new-id"),
    );
  });

  it("reverts the optimistic mark when the write fails", async () => {
    const onWatched = vi.fn();
    const onUnwatched = vi.fn();
    (watchBoardCompany as any).mockResolvedValue({
      success: false,
      message: "boom",
    });
    renderTable({ onWatched, onUnwatched });

    await user.click(screen.getByRole("button", { name: /watch anthropic/i }));

    await waitFor(() => expect(onUnwatched).toHaveBeenCalledWith("anthropic"));
  });

  it("raises the merge prompt instead of writing", async () => {
    const onNeedsMerge = vi.fn();
    (watchBoardCompany as any).mockResolvedValue({
      success: false,
      needsConfirm: true,
      existing: { id: "acme-id", label: "Anthropic PBC" },
    });
    renderTable({ onNeedsMerge });

    await user.click(screen.getByRole("button", { name: /watch anthropic/i }));

    await waitFor(() =>
      expect(onNeedsMerge).toHaveBeenCalledWith({
        provider: "ashby",
        board: { name: "Anthropic", token: "anthropic" },
        existing: { id: "acme-id", label: "Anthropic PBC" },
      }),
    );
  });

  it("unwatches in place from the watched cell", async () => {
    const onUnwatched = vi.fn();
    (setCompanyWatched as any).mockResolvedValue({ success: true });
    renderTable({ onUnwatched });

    await user.click(screen.getByRole("button", { name: /unwatch ramp/i }));

    await waitFor(() => {
      expect(setCompanyWatched).toHaveBeenCalledWith("company-ramp", false);
      expect(onUnwatched).toHaveBeenCalledWith("ramp");
    });
  });
});
