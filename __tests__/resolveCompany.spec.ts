import {
  resolveCompany,
  resolveJobTitle,
  resolveLocation,
  resolveJobSource,
} from "@/lib/jobs/resolve";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    company: { findUnique: vi.fn(), create: vi.fn() },
    jobTitle: { findUnique: vi.fn(), create: vi.fn() },
    location: { findUnique: vi.fn(), create: vi.fn() },
    jobSource: { findUnique: vi.fn(), create: vi.fn() },
  };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});

describe("resolveCompany", () => {
  const userId = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.company.findUnique as any).mockResolvedValue(null);
    (prisma.company.create as any).mockImplementation(({ data }: any) =>
      Promise.resolve({ id: `company-${data.value}`, label: data.label }),
    );
  });

  it("creates a new company keyed by its legal-suffix-stripped value", async () => {
    const result = await resolveCompany("Acme Inc.", userId);

    expect(prisma.company.findUnique).toHaveBeenCalledWith({
      where: { value_createdBy: { value: "acme", createdBy: userId } },
    });
    expect(result).toEqual({ id: "company-acme", label: "Acme Inc.", created: true });
  });

  it("reuses an existing company instead of creating a duplicate", async () => {
    (prisma.company.findUnique as any).mockResolvedValue({
      id: "existing-company",
      label: "Acme",
    });

    const result = await resolveCompany("Acme Inc.", userId);

    expect(prisma.company.create).not.toHaveBeenCalled();
    expect(result).toEqual({ id: "existing-company", label: "Acme", created: false });
  });

  it("recovers from a concurrent-create race instead of throwing", async () => {
    (prisma.company.findUnique as any)
      .mockResolvedValueOnce(null) // this call's own findUnique: nothing yet
      .mockResolvedValueOnce({ id: "winner-company", label: "Acme" }); // re-fetch after losing the race
    const p2002 = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
    });
    (prisma.company.create as any).mockRejectedValue(p2002);

    const result = await resolveCompany("Acme", userId);

    expect(result).toEqual({ id: "winner-company", label: "Acme", created: false });
  });

  it("rethrows non-P2002 errors from create", async () => {
    (prisma.company.create as any).mockRejectedValue(new Error("connection lost"));

    await expect(resolveCompany("Acme", userId)).rejects.toThrow("connection lost");
  });
});

describe("resolveJobTitle", () => {
  const userId = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.jobTitle.findUnique as any).mockResolvedValue(null);
    (prisma.jobTitle.create as any).mockImplementation(({ data }: any) =>
      Promise.resolve({ id: `title-${data.value}`, label: data.label }),
    );
  });

  it("does not strip a trailing word that looks like a legal suffix", async () => {
    // Job titles don't get stripLegalSuffix, so "... Co" style titles keep
    // their full canonical value (only Company resolution strips suffixes).
    await resolveJobTitle("Head of Co", userId);

    expect(prisma.jobTitle.findUnique).toHaveBeenCalledWith({
      where: { value_createdBy: { value: "head of co", createdBy: userId } },
    });
  });
});

describe("resolveLocation", () => {
  const userId = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.location.findUnique as any).mockResolvedValue(null);
    (prisma.location.create as any).mockImplementation(({ data }: any) =>
      Promise.resolve({ id: `location-${data.value}`, label: data.label }),
    );
  });

  it("creates a new location keyed by its canonical value", async () => {
    const result = await resolveLocation("San Francisco, CA", userId);

    expect(prisma.location.findUnique).toHaveBeenCalledWith({
      where: { value_createdBy: { value: "san francisco ca", createdBy: userId } },
    });
    expect(result).toEqual({
      id: "location-san francisco ca",
      label: "San Francisco, CA",
      created: true,
    });
  });

  it("reuses an existing location instead of creating a duplicate", async () => {
    (prisma.location.findUnique as any).mockResolvedValue({
      id: "existing-location",
      label: "Remote",
    });

    const result = await resolveLocation("Remote", userId);

    expect(prisma.location.create).not.toHaveBeenCalled();
    expect(result).toEqual({ id: "existing-location", label: "Remote", created: false });
  });
});

describe("resolveJobSource", () => {
  const userId = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.jobSource.findUnique as any).mockResolvedValue(null);
    (prisma.jobSource.create as any).mockImplementation(({ data }: any) =>
      Promise.resolve({ id: `source-${data.value}`, label: data.label }),
    );
  });

  it("creates a new job source keyed by its canonical value", async () => {
    const result = await resolveJobSource("Greenhouse", userId);

    expect(prisma.jobSource.findUnique).toHaveBeenCalledWith({
      where: { value_createdBy: { value: "greenhouse", createdBy: userId } },
    });
    expect(result).toEqual({ id: "source-greenhouse", label: "Greenhouse", created: true });
  });

  it("reuses an existing job source instead of creating a duplicate", async () => {
    (prisma.jobSource.findUnique as any).mockResolvedValue({
      id: "existing-source",
      label: "Lever",
    });

    const result = await resolveJobSource("Lever", userId);

    expect(prisma.jobSource.create).not.toHaveBeenCalled();
    expect(result).toEqual({ id: "existing-source", label: "Lever", created: false });
  });
});

describe("resolveEntity — empty label guard", () => {
  const userId = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Regression guard: consolidating Company/JobTitle/Location/JobSource
  // resolution into the shared resolveEntity() dropped the `if (!value)
  // throw` guard the standalone createLocation/createJobSource/createJobTitle
  // actions used to have — without it, a whitespace-only label silently
  // created a blank-labeled record instead of failing loudly.
  it("throws instead of creating a blank company for a whitespace-only label", async () => {
    await expect(resolveCompany("   ", userId)).rejects.toThrow(
      "A non-empty label is required",
    );
    expect(prisma.company.findUnique).not.toHaveBeenCalled();
    expect(prisma.company.create).not.toHaveBeenCalled();
  });

  it("throws instead of creating a blank job title for an empty label", async () => {
    await expect(resolveJobTitle("", userId)).rejects.toThrow(
      "A non-empty label is required",
    );
    expect(prisma.jobTitle.create).not.toHaveBeenCalled();
  });

  it("throws instead of creating a blank location for a whitespace-only label", async () => {
    await expect(resolveLocation("   ", userId)).rejects.toThrow(
      "A non-empty label is required",
    );
    expect(prisma.location.create).not.toHaveBeenCalled();
  });

  it("throws instead of creating a blank job source for a whitespace-only label", async () => {
    await expect(resolveJobSource("   ", userId)).rejects.toThrow(
      "A non-empty label is required",
    );
    expect(prisma.jobSource.create).not.toHaveBeenCalled();
  });

  it("throws for a label that canonicalizes to empty (e.g. a bare comma)", async () => {
    await expect(resolveLocation(",", userId)).rejects.toThrow(
      "A non-empty label is required",
    );
    expect(prisma.location.create).not.toHaveBeenCalled();
  });
});
