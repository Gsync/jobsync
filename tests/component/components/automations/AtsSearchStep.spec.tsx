import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AtsSearchStep } from "@/components/automations/AtsSearchStep";
import { toastInfo } from "@/lib/toast";

vi.mock("@/actions/atsCompany.actions", () => ({
  searchAtsCompanies: vi
    .fn()
    .mockResolvedValue({ companies: [], hasMore: false }),
  getAtsCompanyCount: vi.fn().mockResolvedValue(0),
  resolveAtsBoard: vi.fn(),
}));

vi.mock("@/actions/company.actions", () => ({
  getWatchedBoards: vi.fn().mockResolvedValue([
    { id: "1", name: "Acme", token: "acme", provider: "greenhouse" },
    { id: "2", name: "Beta", token: "beta", provider: "greenhouse" },
    { id: "3", name: "Gamma", token: "gamma", provider: "greenhouse" },
  ]),
}));

// TargetingFields pulls four entity actions for its chip inputs; all four must
// be mocked or the module throws at import.
vi.mock("@/actions/jobtitle.actions", () => ({
  getAllJobTitles: vi.fn().mockResolvedValue([]),
  createJobTitle: vi.fn(),
}));

vi.mock("@/actions/tag.actions", () => ({
  getAllTags: vi.fn().mockResolvedValue([]),
  createTag: vi.fn(),
}));

vi.mock("@/actions/jobLocation.actions", () => ({
  getAllJobLocations: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/actions/job.actions", () => ({
  createLocation: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  toastInfo: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

// Required by Radix UI Popover / Command components
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();

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
  range.getClientRects = () => ({
    item: () => null,
    length: 0,
    [Symbol.iterator]: vi.fn(),
  });
  return range;
};

describe("AtsSearchStep batch add", () => {
  const user = userEvent.setup();

  const openPicker = async (companies: any[] = []) => {
    const onChange = vi.fn();
    render(
      <AtsSearchStep
        provider="greenhouse"
        value={{ companies } as any}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /search companies/i }));
    return onChange;
  };

  const clickAddAll = async () => {
    await user.click(
      await screen.findByRole("button", { name: /add all watched/i }),
    );
  };

  it("adds every watched board in exactly one onChange", async () => {
    const onChange = await openPicker();

    await clickAddAll();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].companies).toHaveLength(3);
    expect(onChange.mock.calls[0][0].companies.map((c: any) => c.token)).toEqual(
      ["acme", "beta", "gamma"],
    );
  });

  it("dedupes against the current selection by token", async () => {
    const onChange = await openPicker([{ name: "Acme", token: "acme" }]);

    await clickAddAll();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].companies.map((c: any) => c.token)).toEqual(
      ["acme", "beta", "gamma"],
    );
  });

  it("slices to the remaining slots at the 25 cap", async () => {
    const existing = Array.from({ length: 24 }, (_, i) => ({
      name: `C${i}`,
      token: `c${i}`,
    }));
    const onChange = await openPicker(existing);

    await clickAddAll();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].companies).toHaveLength(25);
  });

  it("reports how many were skipped at the cap", async () => {
    const existing = Array.from({ length: 24 }, (_, i) => ({
      name: `C${i}`,
      token: `c${i}`,
    }));
    await openPicker(existing);

    await clickAddAll();

    expect(toastInfo).toHaveBeenCalledWith(expect.stringMatching(/2 skipped/i));
  });
});
