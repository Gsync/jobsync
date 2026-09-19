import {
  resolveJobStageType,
  resolveStageTypeForStatusId,
} from "@/lib/jobs/resolve";
import prisma from "@/lib/db";

vi.mock("@/lib/db", () => ({
  default: {
    jobStageType: {
      findUnique: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    jobStatus: { findUnique: vi.fn() },
  },
}));

const db = prisma as any;

describe("resolveJobStageType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.jobStageType.aggregate.mockResolvedValue({ _max: { sortOrder: 13 } });
  });

  it("matches an existing type on canonical value", async () => {
    db.jobStageType.findUnique.mockResolvedValue({ id: "t1", label: "On-site" });

    const res = await resolveJobStageType("  ON-SITE  ", "u1", "s1");

    expect(db.jobStageType.findUnique).toHaveBeenCalledWith({
      where: { value_createdBy: { value: "on-site", createdBy: "u1" } },
    });
    expect(res).toEqual({ id: "t1", label: "On-site", created: false });
    expect(db.jobStageType.create).not.toHaveBeenCalled();
  });

  // D7: canonicalizeEntityValue folds case, diacritics, commas and whitespace
  // and nothing else, so "On-site" and "Onsite" are genuinely two types. This
  // test pins the limit so nobody later reads the resolver as fuzzy matching.
  it("does not fold hyphens, so On-site and Onsite are different types", async () => {
    db.jobStageType.findUnique.mockResolvedValue(null);
    db.jobStageType.create.mockResolvedValue({ id: "t9", label: "Onsite" });

    await resolveJobStageType("Onsite", "u1", "s1");

    expect(db.jobStageType.findUnique).toHaveBeenCalledWith({
      where: { value_createdBy: { value: "onsite", createdBy: "u1" } },
    });
    expect(db.jobStageType.create).toHaveBeenCalled();
  });

  // Only `value` collapses internal whitespace; the label is stored trimmed
  // but otherwise verbatim, exactly as resolveEntity does for the other five.
  it("creates with the trimmed label, canonical value and the next sortOrder", async () => {
    db.jobStageType.findUnique.mockResolvedValue(null);
    db.jobStageType.create.mockResolvedValue({
      id: "t2",
      label: "Panel  Interview",
    });

    const res = await resolveJobStageType(" Panel  Interview ", "u1", "s9");

    expect(db.jobStageType.create).toHaveBeenCalledWith({
      data: {
        label: "Panel  Interview",
        value: "panel interview",
        statusId: "s9",
        sortOrder: 14,
        createdBy: "u1",
      },
    });
    expect(res.created).toBe(true);
  });

  it("returns the winner's row when a concurrent create wins the unique race", async () => {
    db.jobStageType.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "t3", label: "Panel" });
    db.jobStageType.create.mockRejectedValue({ code: "P2002" });

    const res = await resolveJobStageType("Panel", "u1", "s1");

    expect(res).toEqual({ id: "t3", label: "Panel", created: false });
  });

  it("rejects an empty label", async () => {
    await expect(resolveJobStageType("   ", "u1", "s1")).rejects.toThrow(
      "A non-empty label is required",
    );
  });
});

describe("resolveStageTypeForStatusId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.jobStageType.aggregate.mockResolvedValue({ _max: { sortOrder: 13 } });
  });

  // The two hyphenated offer statuses are why the key is the canonical LABEL
  // and not status.value: "offer-accepted" would never match the seeded row.
  it("looks the type up by the canonical form of the status label", async () => {
    db.jobStatus.findUnique.mockResolvedValue({
      id: "s-oa",
      label: "Offer Accepted",
      value: "offer-accepted",
    });
    db.jobStageType.findUnique.mockResolvedValue({
      id: "t-oa",
      label: "Offer Accepted",
    });

    const id = await resolveStageTypeForStatusId("s-oa", "u1");

    expect(db.jobStageType.findUnique).toHaveBeenCalledWith({
      where: { value_createdBy: { value: "offer accepted", createdBy: "u1" } },
    });
    expect(id).toBe("t-oa");
  });

  it("creates the status-named type when the user has deleted it", async () => {
    db.jobStatus.findUnique.mockResolvedValue({
      id: "s-w",
      label: "Withdrawn",
      value: "withdrawn",
    });
    db.jobStageType.findUnique.mockResolvedValue(null);
    db.jobStageType.create.mockResolvedValue({ id: "t-w", label: "Withdrawn" });

    const id = await resolveStageTypeForStatusId("s-w", "u1");

    expect(id).toBe("t-w");
    expect(db.jobStageType.create).toHaveBeenCalled();
  });

  it("throws when the status does not exist", async () => {
    db.jobStatus.findUnique.mockResolvedValue(null);

    await expect(resolveStageTypeForStatusId("nope", "u1")).rejects.toThrow(
      "Job status not found",
    );
  });
});
