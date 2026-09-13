import { renderHook } from "@testing-library/react";
import { useTabQueryParam } from "@/hooks/useTabQueryParam";

const router = { replace: vi.fn() };
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
}));

describe("useTabQueryParam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
  });

  it("keeps the other query params when switching tabs", () => {
    searchParams = new URLSearchParams("scope=watchlist&tab=jobs");
    const { result } = renderHook(() =>
      useTabQueryParam(["jobs", "contacts"], "jobs"),
    );

    result.current[1]("contacts");

    expect(router.replace).toHaveBeenCalledWith(
      "?scope=watchlist&tab=contacts",
      { scroll: false },
    );
  });

  it("writes just the tab when there is nothing else in the URL", () => {
    const { result } = renderHook(() =>
      useTabQueryParam(["jobs", "contacts"], "jobs"),
    );

    result.current[1]("contacts");

    expect(router.replace).toHaveBeenCalledWith("?tab=contacts", {
      scroll: false,
    });
  });
});
