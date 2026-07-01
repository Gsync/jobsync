vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: vi.fn(),
}));

import {
  resolveGreenhouseBoard,
  searchGreenhouseCompanies,
} from "@/actions/greenhouseCompany.actions";
import { getCurrentUser } from "@/utils/user.utils";

const user = { id: "user-1" };

describe("resolveGreenhouseBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(user);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts token from a boards.greenhouse.io URL", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ name: "Anthropic" }),
    } as Response);

    const result = await resolveGreenhouseBoard(
      "https://boards.greenhouse.io/anthropic",
    );
    expect(result).toEqual({ success: true, name: "Anthropic", token: "anthropic" });
  });

  it("extracts token from a job-boards.greenhouse.io URL", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ name: "Stripe" }),
    } as Response);

    const result = await resolveGreenhouseBoard(
      "https://job-boards.greenhouse.io/stripe/jobs/123",
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.token).toBe("stripe");
  });

  it("accepts a bare token", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ name: "Linear" }),
    } as Response);

    const result = await resolveGreenhouseBoard("linear");
    expect(result.success).toBe(true);
    if (result.success) expect(result.token).toBe("linear");
  });

  it("returns an error on 404", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);

    const result = await resolveGreenhouseBoard("nonexistent");
    expect(result.success).toBe(false);
  });

  it("rejects a non-Greenhouse URL", async () => {
    const result = await resolveGreenhouseBoard("https://careers.acme.com/jobs");
    expect(result.success).toBe(false);
  });

  it("requires authentication", async () => {
    (getCurrentUser as any).mockResolvedValue(null);
    const result = await resolveGreenhouseBoard("anthropic");
    expect(result.success).toBe(false);
  });
});

describe("searchGreenhouseCompanies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(user);
  });

  it("filters the seeded directory by name", async () => {
    const results = await searchGreenhouseCompanies("genomics");
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some((c) => c.name.toLowerCase().includes("genomics")),
    ).toBe(true);
  });

  it("caps results at 20", async () => {
    const results = await searchGreenhouseCompanies("a");
    expect(results.length).toBeLessThanOrEqual(20);
  });

  it("returns the full list for an empty query (browse mode)", async () => {
    const results = await searchGreenhouseCompanies("");
    expect(results.length).toBeGreaterThan(20);
  });
});
