import { resolveContactRole } from "@/lib/jobs/resolve";
import prisma from "@/lib/db";

vi.mock("@/lib/db", () => ({
  default: {
    contactRole: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

const db = prisma as unknown as {
  contactRole: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

describe("resolveContactRole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the existing row for a differently-cased label", async () => {
    db.contactRole.findUnique.mockResolvedValue({ id: "r1", label: "Recruiter" });

    const res = await resolveContactRole("  RECRUITER ", "u1");

    expect(res).toEqual({ id: "r1", label: "Recruiter", created: false });
    expect(db.contactRole.findUnique).toHaveBeenCalledWith({
      where: { value_createdBy: { value: "recruiter", createdBy: "u1" } },
    });
    expect(db.contactRole.create).not.toHaveBeenCalled();
  });

  it("creates the row with the trimmed label and canonical value", async () => {
    db.contactRole.findUnique.mockResolvedValue(null);
    db.contactRole.create.mockResolvedValue({ id: "r2", label: "Panel Lead" });

    const res = await resolveContactRole(" Panel Lead ", "u1");

    expect(res).toEqual({ id: "r2", label: "Panel Lead", created: true });
    expect(db.contactRole.create).toHaveBeenCalledWith({
      data: { label: "Panel Lead", value: "panel lead", createdBy: "u1" },
    });
  });

  it("returns the winner's row when a concurrent create loses on P2002", async () => {
    db.contactRole.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "r3", label: "Referrer" });
    db.contactRole.create.mockRejectedValue({ code: "P2002" });

    const res = await resolveContactRole("Referrer", "u1");

    expect(res).toEqual({ id: "r3", label: "Referrer", created: false });
  });
});
