import { resolveResumeForAgent } from "@/lib/agent/resumeLookup";
import prisma from "@/lib/db";

vi.mock("@/lib/db", () => ({
  default: {
    resume: { findMany: vi.fn(), findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

const db = prisma as unknown as {
  resume: { findMany: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> };
  user: { findUnique: ReturnType<typeof vi.fn> };
};

const titles = [
  { id: "r1", title: "Senior Engineer Resume" },
  { id: "r2", title: "Product Manager Resume" },
];

describe("resolveResumeForAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.resume.findMany.mockResolvedValue(titles);
    db.resume.findFirst.mockResolvedValue({ id: "r1", title: "Senior Engineer Resume" });
    db.user.findUnique.mockResolvedValue({ defaultResumeId: null });
  });

  it("scopes the title listing to the caller", async () => {
    await resolveResumeForAgent("user-1", {});
    expect(db.resume.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { profile: { userId: "user-1" } } }),
    );
  });

  it("matches a named resume case-insensitively", async () => {
    const result = await resolveResumeForAgent("user-1", { title: "senior engineer resume" });
    expect(result.status).toBe("ok");
    expect(db.resume.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "r1", profile: { userId: "user-1" } } }),
    );
    if (result.status === "ok") expect(result.source).toBe("named");
  });

  it("falls back to a substring match when nothing matches exactly", async () => {
    const result = await resolveResumeForAgent("user-1", { title: "product manager" });
    expect(result.status).toBe("ok");
    expect(db.resume.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "r2", profile: { userId: "user-1" } } }),
    );
  });

  // Deterministic rather than another question: the picker sends a title
  // back, so asking again about duplicate titles would never terminate.
  it("picks the first of duplicate titles and flags it as ambiguous", async () => {
    db.resume.findMany.mockResolvedValue([
      { id: "r1", title: "My Resume" },
      { id: "r2", title: "My Resume" },
    ]);
    const result = await resolveResumeForAgent("user-1", { title: "My Resume" });
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.ambiguousTitle).toBe(true);
  });

  it("uses the page resume when no title was given", async () => {
    const result = await resolveResumeForAgent("user-1", { pageResumeId: "r2" });
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.source).toBe("page");
    expect(db.resume.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "r2", profile: { userId: "user-1" } } }),
    );
  });

  // pageContext is client-supplied. Ownership is proved by the scoped title
  // listing, not by trusting the id.
  it("ignores a page resume the caller does not own", async () => {
    const result = await resolveResumeForAgent("user-1", { pageResumeId: "someone-elses" });
    expect(result.status).toBe("needs_selection");
    expect(db.resume.findFirst).not.toHaveBeenCalled();
  });

  it("prefers a named resume over the page resume", async () => {
    const result = await resolveResumeForAgent("user-1", {
      title: "Product Manager Resume",
      pageResumeId: "r1",
    });
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.source).toBe("named");
  });

  it("falls back to the default resume", async () => {
    db.user.findUnique.mockResolvedValue({ defaultResumeId: "r2" });
    const result = await resolveResumeForAgent("user-1", {});
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.source).toBe("default");
  });

  it("uses the only resume when there is exactly one and no default", async () => {
    db.resume.findMany.mockResolvedValue([titles[0]]);
    const result = await resolveResumeForAgent("user-1", {});
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.source).toBe("only");
  });

  it("asks for a selection when several resumes and no default", async () => {
    const result = await resolveResumeForAgent("user-1", {});
    expect(result).toEqual({ status: "needs_selection", resumes: titles });
  });

  it("asks for a selection when a named resume matches nothing", async () => {
    const result = await resolveResumeForAgent("user-1", { title: "Nursing CV" });
    expect(result.status).toBe("needs_selection");
  });

  it("reports no resumes at all", async () => {
    db.resume.findMany.mockResolvedValue([]);
    expect(await resolveResumeForAgent("user-1", {})).toEqual({ status: "no_resumes" });
  });
});
