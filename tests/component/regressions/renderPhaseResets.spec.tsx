// Pins the reset/derive behaviour of hooks and components whose effects
// moved into render for the react-hooks v7 rules (Next 16 upgrade).
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { StageNotes } from "@/components/myjobs/job-details/timeline/StageNotes";
import { useJobStages } from "@/components/myjobs/job-details/timeline/useJobStages";
import { useJobFilterCounts } from "@/components/myjobs/jobs-container/useJobFilterCounts";
import { useJobFilters } from "@/components/myjobs/jobs-container/useJobFilters";
import { StepperRow } from "@/components/pdf-export/settings-rows";
import { useExportSettings } from "@/components/pdf-export/useExportSettings";
import { useSlowResponseWarning } from "@/hooks/useSlowResponseWarning";
import { useBoardsBrowse } from "@/components/admin/companies-container/useBoardsBrowse";
import { useWatchedBoards } from "@/components/automations/ats-search-step/useWatchedBoards";
import { getJobStages } from "@/actions/jobStage.actions";
import { getJobFilterCounts } from "@/actions/job.actions";
import { getAtsCompanyCount, searchAtsCompanies } from "@/actions/atsCompany.actions";
import { getWatchedBoards } from "@/actions/company.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import { EMPTY_JOB_FACETS } from "@/lib/jobs/jobFacets";
import type { JobStage } from "@/models/jobStage.model";

let search = "";
let cachedSearch = "";
let cachedParams = new URLSearchParams();
const router = { push: vi.fn(), replace: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/dashboard/myjobs",
  useSearchParams: () => {
    if (search !== cachedSearch) {
      cachedSearch = search;
      cachedParams = new URLSearchParams(search);
    }
    return cachedParams;
  },
}));
vi.mock("@/actions/jobStage.actions", () => ({
  getJobStages: vi.fn(),
  setStageNotes: vi.fn(),
}));
vi.mock("@/actions/job.actions", () => ({ getJobFilterCounts: vi.fn() }));
vi.mock("@/actions/atsCompany.actions", () => ({
  getAtsCompanyCount: vi.fn(),
  searchAtsCompanies: vi.fn(),
}));
vi.mock("@/actions/company.actions", () => ({ getWatchedBoards: vi.fn() }));
vi.mock("@/hooks/useInfiniteScroll", () => ({
  useInfiniteScroll: () => ({ current: null }),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function stage(id: string, overrides: Partial<JobStage> = {}): JobStage {
  return {
    id,
    jobId: "j1",
    stageTypeId: `t-${id}`,
    occurredAt: null,
    isCurrent: false,
    outcome: null,
    notes: null,
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    StageType: {
      id: `t-${id}`,
      label: id,
      value: id,
      statusId: "s",
      sortOrder: Number(id.replace(/\D/g, "")) || 0,
      Status: { id: "s", label: "S", value: "s" },
    },
    ...overrides,
  } as JobStage;
}

beforeEach(() => {
  localStorage.clear();
  search = "";
});

describe("StageNotes", () => {
  it("follows a switch to another stage", () => {
    const { rerender } = render(
      <StageNotes stage={stage("s1", { notes: "first" })} onChanged={vi.fn()} />,
    );
    rerender(
      <StageNotes stage={stage("s2", { notes: "second" })} onChanged={vi.fn()} />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("second");
  });

  it("keeps the draft across a re-render of the same stage", () => {
    const s1 = stage("s1", { notes: "first" });
    const { rerender } = render(<StageNotes stage={s1} onChanged={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "draft" } });
    rerender(
      <StageNotes stage={stage("s1", { notes: "first" })} onChanged={vi.fn()} />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("draft");
  });
});

describe("useJobStages", () => {
  it("re-homes to the current stage when the selected one is deleted", async () => {
    const s1 = stage("s1");
    const s2 = stage("s2", { isCurrent: true });
    const s3 = stage("s3");
    const { result } = renderHook(() => useJobStages("j1", [s1, s2, s3]));
    expect(result.current.selectedStageId).toBe("s2");
    act(() => result.current.selectStage("s3"));
    expect(result.current.selectedStageId).toBe("s3");

    vi.mocked(getJobStages).mockResolvedValue([s1, s2] as never);
    await act(() => result.current.reload());
    expect(result.current.selectedStageId).toBe("s2");
    expect(result.current.selectedStage?.id).toBe("s2");
  });

  it("falls back to the first stage with no current stage", () => {
    const { result } = renderHook(() =>
      useJobStages("j1", [stage("s2"), stage("s1")]),
    );
    expect(result.current.selectedStageId).toBe("s1");
  });
});

describe("useJobFilterCounts", () => {
  const props = {
    facets: EMPTY_JOB_FACETS,
    search: "",
    scope: "all" as never,
  };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns null as soon as it is disabled, even with a reply in flight", async () => {
    const reply = deferred<unknown>();
    vi.mocked(getJobFilterCounts).mockReturnValueOnce(reply.promise as never);
    const { result, rerender } = renderHook(
      ({ enabled }) => useJobFilterCounts({ ...props, enabled }),
      { initialProps: { enabled: true } },
    );
    await act(() => vi.advanceTimersByTimeAsync(300));
    rerender({ enabled: false });
    expect(result.current).toBeNull();
    await act(async () => reply.resolve({ success: true, data: { total: 3 } }));
    expect(result.current).toBeNull();
  });

  it("does not show the discarded draft's counts on reopen", async () => {
    vi.mocked(getJobFilterCounts).mockResolvedValueOnce({
      success: true,
      data: { total: 3 },
    } as never);
    vi.mocked(getJobFilterCounts).mockReturnValueOnce(new Promise(() => {}));
    const { result, rerender } = renderHook(
      ({ enabled }) => useJobFilterCounts({ ...props, enabled }),
      { initialProps: { enabled: true } },
    );
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(result.current).toEqual({ total: 3 });
    rerender({ enabled: false });
    rerender({ enabled: true });
    expect(result.current).toBeNull();
  });
});

describe("useJobFilters", () => {
  it("follows every filter in a changed URL", () => {
    const lists = { companies: [], titles: [], locations: [], sources: [] };
    const { result, rerender } = renderHook(() => useJobFilters(lists));
    expect(result.current.companyFilter).toBeNull();
    search = "company=c1&title=t1&location=l1&source=s1&applied=true";
    rerender();
    expect(result.current.companyFilter).toBe("c1");
    expect(result.current.titleFilter).toBe("t1");
    expect(result.current.locationFilter).toBe("l1");
    expect(result.current.sourceFilter).toBe("s1");
    expect(result.current.appliedFilter).toBe(true);
  });
});

describe("StepperRow", () => {
  it("resyncs the draft when the value moves without typing (Reset)", () => {
    const { rerender } = render(
      <StepperRow idPrefix="p" field="fontSize" value={10} onCommit={vi.fn()} />,
    );
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "1" } });
    expect(input).toHaveValue(1);
    rerender(
      <StepperRow idPrefix="p" field="fontSize" value={10} onCommit={vi.fn()} />,
    );
    expect(input).toHaveValue(1);
    rerender(
      <StepperRow idPrefix="p" field="fontSize" value={11} onCommit={vi.fn()} />,
    );
    expect(input).toHaveValue(11);
  });
});

describe("useExportSettings", () => {
  const defaults = { a: 1 };
  const coerce = (stored: unknown) =>
    stored && typeof stored === "object" ? (stored as typeof defaults) : defaults;

  it("reads stored settings on open and drops ready on close", () => {
    localStorage.setItem("export-key", JSON.stringify({ a: 2 }));
    const { result, rerender } = renderHook(
      ({ open }) =>
        useExportSettings({ defaults, coerce, storageKey: "export-key", open }),
      { initialProps: { open: false } },
    );
    expect(result.current.ready).toBe(false);
    rerender({ open: true });
    expect(result.current.ready).toBe(true);
    expect(result.current.settings).toEqual({ a: 2 });
    rerender({ open: false });
    expect(result.current.ready).toBe(false);
  });
});

describe("useSlowResponseWarning", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("warns after the threshold and clears the render loading ends", () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useSlowResponseWarning(loading, false),
      { initialProps: { loading: true } },
    );
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(APP_CONSTANTS.AI_SLOW_RESPONSE_THRESHOLD_MS));
    expect(result.current).toBe(true);
    rerender({ loading: false });
    expect(result.current).toBe(false);
    rerender({ loading: true });
    expect(result.current).toBe(false);
  });
});

describe("useBoardsBrowse", () => {
  it("clears rows and the seed total on a provider change, before the fetch", async () => {
    vi.mocked(getWatchedBoards).mockResolvedValue([]);
    vi.mocked(getAtsCompanyCount).mockResolvedValueOnce(40);
    vi.mocked(searchAtsCompanies).mockResolvedValueOnce({
      companies: [{ name: "Acme", token: "acme" }],
      hasMore: false,
    } as never);
    const { result, rerender } = renderHook(
      ({ provider }) => useBoardsBrowse(provider, ""),
      { initialProps: { provider: "greenhouse" as never } },
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.total).toBe(40);

    vi.mocked(getAtsCompanyCount).mockReturnValueOnce(new Promise(() => {}));
    vi.mocked(searchAtsCompanies).mockReturnValueOnce(new Promise(() => {}));
    rerender({ provider: "lever" as never });
    expect(result.current.rows).toEqual([]);
    expect(result.current.total).toBeUndefined();
  });
});

describe("useWatchedBoards", () => {
  it("shows loading again when re-enabled", async () => {
    vi.mocked(getWatchedBoards).mockResolvedValueOnce([]);
    const { result, rerender } = renderHook(
      ({ enabled }) => useWatchedBoards("greenhouse" as never, enabled),
      { initialProps: { enabled: true } },
    );
    expect(result.current.loading).toBe(true);
    await act(async () => {});
    expect(result.current.loading).toBe(false);

    vi.mocked(getWatchedBoards).mockReturnValueOnce(new Promise(() => {}));
    rerender({ enabled: false });
    rerender({ enabled: true });
    expect(result.current.loading).toBe(true);
  });
});
