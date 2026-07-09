import { mapScrapedJobToJobRecord, normalizeWorkplaceType } from "@/lib/scraper/mapper";
import db from "@/lib/db";
import type { ScrapedJobData } from "@/models/automation.model";

vi.mock("@/lib/db", () => {
  const mockPrisma = {
    jobTitle: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    location: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    company: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    jobSource: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    jobStatus: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };
  return { default: mockPrisma };
});

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
  mockedDb.location.findFirst.mockResolvedValue(null);
  mockedDb.location.create.mockResolvedValue({ id: "location-1" } as never);
  mockedDb.company.findFirst.mockResolvedValue(null);
  mockedDb.company.create.mockResolvedValue({ id: "company-1" } as never);
  mockedDb.jobSource.findFirst.mockResolvedValue({
    id: "source-1",
  } as never);
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
  beforeEach(() => {
    mockedDb.jobTitle.findFirst.mockResolvedValue({ id: "title-1" } as never);
  });

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

describe("mapScrapedJobToJobRecord - job title matching", () => {
  it("does not reuse a title that only shares one unrelated keyword", async () => {
    mockedDb.jobTitle.findFirst.mockResolvedValue(null);
    mockedDb.jobTitle.create.mockResolvedValue({
      id: "new-title-id",
    } as never);

    const result = await mapScrapedJobToJobRecord(baseInput);

    expect(result.jobTitleId).toBe("new-title-id");
    expect(mockedDb.jobTitle.findFirst).toHaveBeenLastCalledWith({
      where: {
        createdBy: "user-1",
        AND: [
          { value: { contains: "open" } },
          { value: { contains: "source" } },
          { value: { contains: "developer" } },
        ],
      },
    });
    expect(mockedDb.jobTitle.create).toHaveBeenCalledWith({
      data: {
        label: "Open Source Developer",
        value: "open-source-developer",
        createdBy: "user-1",
      },
    });
  });

  it("reuses an existing title when all keywords match", async () => {
    mockedDb.jobTitle.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "existing-title-id" } as never);

    const result = await mapScrapedJobToJobRecord(baseInput);

    expect(result.jobTitleId).toBe("existing-title-id");
    expect(mockedDb.jobTitle.create).not.toHaveBeenCalled();
  });

  it("reuses an exact normalized title match without fuzzy matching", async () => {
    mockedDb.jobTitle.findFirst.mockResolvedValueOnce({
      id: "exact-match-id",
    } as never);

    const result = await mapScrapedJobToJobRecord(baseInput);

    expect(result.jobTitleId).toBe("exact-match-id");
    expect(mockedDb.jobTitle.findFirst).toHaveBeenCalledTimes(1);
    expect(mockedDb.jobTitle.create).not.toHaveBeenCalled();
  });
});

describe("mapScrapedJobToJobRecord - company matching", () => {
  it("does not reuse a company that only shares one unrelated keyword", async () => {
    mockedDb.jobTitle.findFirst.mockResolvedValue({ id: "title-1" } as never);
    mockedDb.company.findFirst.mockResolvedValue(null);
    mockedDb.company.create.mockResolvedValue({
      id: "new-company-id",
    } as never);

    const result = await mapScrapedJobToJobRecord(baseInput);

    expect(result.companyId).toBe("new-company-id");
    expect(mockedDb.company.findFirst).toHaveBeenLastCalledWith({
      where: {
        createdBy: "user-1",
        AND: [{ label: { contains: "figma" } }],
      },
    });
  });
});
