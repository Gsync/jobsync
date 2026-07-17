import { mapScrapedJobToJobRecord, normalizeWorkplaceType } from "@/lib/scraper/mapper";
import db from "@/lib/db";
import {
  resolveCompany,
  resolveJobTitle,
  resolveLocation,
  resolveJobSource,
} from "@/lib/jobs/resolve";
import type { ScrapedJobData } from "@/models/automation.model";

vi.mock("@/lib/db", () => {
  const mockPrisma = {
    jobStatus: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };
  return { default: mockPrisma };
});

// The mapper now delegates entity resolution to the shared resolve-or-create
// helpers (same ones the add_job path uses); mock them so this spec asserts
// mapping/precedence, not resolution internals (covered by resolve/canonicalize).
vi.mock("@/lib/jobs/resolve", () => ({
  resolveCompany: vi.fn(),
  resolveJobTitle: vi.fn(),
  resolveLocation: vi.fn(),
  resolveJobSource: vi.fn(),
}));

const mockedDb = vi.mocked(db, true);

const scrapedJob: ScrapedJobData = {
  title: "Open Source Developer",
  company: "Figma",
  location: "San Francisco, CA",
  description: "A great job",
  sourceUrl: "https://example.com/job/1",
  sourceBoard: "greenhouse" as ScrapedJobData["sourceBoard"],
};

const baseInput = {
  scrapedJob,
  userId: "user-1",
  automationId: "automation-1",
  matchScore: 88,
  matchData: "{}",
};

beforeEach(() => {
  vi.clearAllMocks();
  (resolveJobTitle as any).mockResolvedValue({ id: "title-1", label: "", created: true });
  (resolveLocation as any).mockResolvedValue({ id: "location-1", label: "", created: true });
  (resolveCompany as any).mockResolvedValue({ id: "company-1", label: "", created: true });
  (resolveJobSource as any).mockResolvedValue({ id: "source-1", label: "", created: true });
  mockedDb.jobStatus.findFirst.mockResolvedValue({ id: "status-1" } as never);
});

describe("normalizeWorkplaceType", () => {
  it("maps true to REMOTE", () => {
    expect(normalizeWorkplaceType(true)).toBe("REMOTE");
  });

  it("maps false to null", () => {
    expect(normalizeWorkplaceType(false)).toBeNull();
  });

  it("maps undefined to null", () => {
    expect(normalizeWorkplaceType(undefined)).toBeNull();
  });
});

describe("mapScrapedJobToJobRecord - workplaceType precedence", () => {
  it("prefers an explicit workplaceType (Lever) over the isRemote boolean", async () => {
    const result = await mapScrapedJobToJobRecord({
      ...baseInput,
      scrapedJob: { ...scrapedJob, isRemote: false, workplaceType: "HYBRID" },
    });
    expect(result.workplaceType).toBe("HYBRID");
  });

  it("passes ONSITE through", async () => {
    const result = await mapScrapedJobToJobRecord({
      ...baseInput,
      scrapedJob: { ...scrapedJob, workplaceType: "ONSITE" },
    });
    expect(result.workplaceType).toBe("ONSITE");
  });

  it("falls back to the isRemote boolean when workplaceType is absent (JSearch)", async () => {
    const remote = await mapScrapedJobToJobRecord({
      ...baseInput,
      scrapedJob: { ...scrapedJob, isRemote: true },
    });
    expect(remote.workplaceType).toBe("REMOTE");

    const onsite = await mapScrapedJobToJobRecord({
      ...baseInput,
      scrapedJob: { ...scrapedJob, isRemote: false },
    });
    expect(onsite.workplaceType).toBeNull();
  });
});

describe("mapScrapedJobToJobRecord - entity delegation", () => {
  it("maps resolver ids onto the job record", async () => {
    const result = await mapScrapedJobToJobRecord(baseInput);

    expect(result.jobTitleId).toBe("title-1");
    expect(result.locationId).toBe("location-1");
    expect(result.companyId).toBe("company-1");
    expect(result.jobSourceId).toBe("source-1");
    expect(result.statusId).toBe("status-1");
  });

  it("resolves title/company by their raw labels for the user", async () => {
    await mapScrapedJobToJobRecord(baseInput);

    expect(resolveJobTitle).toHaveBeenCalledWith("Open Source Developer", "user-1");
    expect(resolveCompany).toHaveBeenCalledWith("Figma", "user-1");
  });

  it("title-cases the source board into the JobSource label", async () => {
    await mapScrapedJobToJobRecord(baseInput);

    expect(resolveJobSource).toHaveBeenCalledWith("Greenhouse", "user-1");
  });

  it("skips location resolution and stores null when location is empty", async () => {
    const result = await mapScrapedJobToJobRecord({
      ...baseInput,
      scrapedJob: { ...scrapedJob, location: "" },
    });

    expect(resolveLocation).not.toHaveBeenCalled();
    expect(result.locationId).toBeNull();
  });
});
