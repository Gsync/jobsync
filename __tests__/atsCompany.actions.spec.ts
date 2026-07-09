vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: vi.fn(),
}));

import {
  resolveAtsBoard,
  searchAtsCompanies,
  getAtsCompanyCount,
} from "@/actions/atsCompany.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { APP_CONSTANTS } from "@/lib/constants";

const user = { id: "user-1" };

function okResponse(status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => [] } as Response;
}

describe("resolveAtsBoard (lever branch)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(user);
  });

  afterEach(() => vi.restoreAllMocks());

  it("validates an explicit EU URL against the EU host", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValue(okResponse(200));

    const result = await resolveAtsBoard(
      "lever",
      "https://jobs.eu.lever.co/acme",
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.token).toBe("acme");
    expect(result.host).toBe("eu");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain(
      APP_CONSTANTS.LEVER_EU_BASE_URL,
    );
  });

  it("probes the default host first for a bare token", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValue(okResponse(200));

    const result = await resolveAtsBoard("lever", "acme");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.host).toBe("default");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain(APP_CONSTANTS.LEVER_BASE_URL);
  });

  it("falls back to the EU host when the default host does not resolve", async () => {
    const spy = vi.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      return Promise.resolve(
        url.includes(APP_CONSTANTS.LEVER_EU_BASE_URL)
          ? okResponse(200)
          : okResponse(404),
      );
    });

    const result = await resolveAtsBoard("lever", "acme");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.host).toBe("eu");
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("fails when neither host resolves", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(okResponse(404));

    const result = await resolveAtsBoard("lever", "acme");
    expect(result.success).toBe(false);
  });

  it("rejects a malformed token before any fetch fires", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValue(okResponse(200));

    const result = await resolveAtsBoard("lever", "ab cd");
    expect(result.success).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    (getCurrentUser as any).mockResolvedValue(null);
    const result = await resolveAtsBoard("lever", "acme");
    expect(result.success).toBe(false);
  });
});

describe("resolveAtsBoard (greenhouse branch)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(user);
  });

  afterEach(() => vi.restoreAllMocks());

  it("extracts token from a boards.greenhouse.io URL and returns the API name", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ name: "Anthropic" }),
    } as Response);

    const result = await resolveAtsBoard(
      "greenhouse",
      "https://boards.greenhouse.io/anthropic",
    );
    expect(result).toEqual({
      success: true,
      name: "Anthropic",
      token: "anthropic",
    });
  });

  it("extracts token from a job-boards.greenhouse.io URL", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ name: "Stripe" }),
    } as Response);

    const result = await resolveAtsBoard(
      "greenhouse",
      "https://job-boards.greenhouse.io/stripe/jobs/123",
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.token).toBe("stripe");
  });

  it("returns an error on 404", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);

    const result = await resolveAtsBoard("greenhouse", "nonexistent");
    expect(result.success).toBe(false);
  });

  it("rejects a non-Greenhouse URL", async () => {
    const result = await resolveAtsBoard(
      "greenhouse",
      "https://careers.acme.com/jobs",
    );
    expect(result.success).toBe(false);
  });

  it("requires authentication", async () => {
    (getCurrentUser as any).mockResolvedValue(null);
    const result = await resolveAtsBoard("greenhouse", "anthropic");
    expect(result.success).toBe(false);
  });
});

describe("searchAtsCompanies / getAtsCompanyCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(user);
  });

  it("searches the Greenhouse seed", async () => {
    const { companies } = await searchAtsCompanies("greenhouse", "genomics");
    expect(
      companies.some((c) => c.name.toLowerCase().includes("genomics")),
    ).toBe(true);
  });

  it("returns the seeded Lever company count", async () => {
    const count = await getAtsCompanyCount("lever");
    expect(count).toBeGreaterThan(100);
  });

  it("searches the Lever seed by name and token", async () => {
    const { companies } = await searchAtsCompanies("lever", "activecampaign");
    expect(companies.some((c) => c.token === "activecampaign")).toBe(true);
  });

  it("paginates the browse list and reports hasMore", async () => {
    const first = await searchAtsCompanies("lever", "");
    expect(first.companies).toHaveLength(50);
    expect(first.hasMore).toBe(true);

    const second = await searchAtsCompanies("lever", "", 50);
    expect(second.companies).toHaveLength(50);
    // No overlap between consecutive pages.
    const firstTokens = new Set(first.companies.map((c) => c.token));
    expect(second.companies.every((c) => !firstTokens.has(c.token))).toBe(true);
  });
});
