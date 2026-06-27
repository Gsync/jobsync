import { resolveImportCard } from "@/actions/resumeImport.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";
import { APP_CONSTANTS } from "@/lib/constants";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    resume: { findUnique: vi.fn() },
    resumeSection: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    skill: { createMany: vi.fn() },
    tag: { findUnique: vi.fn(), create: vi.fn() },
  };
  return {
    PrismaClient: vi.fn(function () {
      return mPrismaClient;
    }),
  };
});

vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));

describe("resolveImportCard — skills", () => {
  const mockUser = { id: "user-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.resume.findUnique as any).mockResolvedValue({ id: "resume-1" });
    (prisma.resumeSection.create as any).mockResolvedValue({ id: "section-1" });
    (prisma.skill.createMany as any).mockResolvedValue({ count: 0 });
    // resolveTag: every name is a brand-new tag
    (prisma.tag.findUnique as any).mockResolvedValue(null);
    (prisma.tag.create as any).mockImplementation(({ data }: any) =>
      Promise.resolve({
        id: `tag-${data.value}`,
        label: data.label,
        value: data.value,
        createdBy: data.createdBy,
      }),
    );
  });

  it("creates a SKILLS section and skill rows with resolved tags, categories and order", async () => {
    const result = await resolveImportCard("resume-1", {
      type: "skills",
      data: {
        categories: [
          { label: "Languages", skills: ["TypeScript", "Go"] },
          { label: "Tools", skills: ["Docker"] },
        ],
      },
    } as any);

    expect(result).toEqual({ success: true, status: "saved" });

    expect(prisma.resumeSection.create).toHaveBeenCalledWith({
      data: {
        resumeId: "resume-1",
        sectionTitle: "Skills",
        sectionType: "skills",
      },
    });

    expect(prisma.skill.createMany).toHaveBeenCalledWith({
      data: [
        { tagId: "tag-typescript", category: "Languages", order: 0, resumeSectionId: "section-1" },
        { tagId: "tag-go", category: "Languages", order: 1, resumeSectionId: "section-1" },
        { tagId: "tag-docker", category: "Tools", order: 2, resumeSectionId: "section-1" },
      ],
    });
  });

  it("stores a null category when no label is given", async () => {
    await resolveImportCard("resume-1", {
      type: "skills",
      data: { categories: [{ skills: ["React"] }] },
    } as any);

    const rows = (prisma.skill.createMany as any).mock.calls[0][0].data;
    expect(rows[0].category).toBeNull();
  });

  it("trims skills and drops empty entries/categories", async () => {
    await resolveImportCard("resume-1", {
      type: "skills",
      data: {
        categories: [
          { label: "  Backend  ", skills: ["  SQL  ", "", "   "] },
          { label: "Empty", skills: [] },
        ],
      },
    } as any);

    const rows = (prisma.skill.createMany as any).mock.calls[0][0].data;
    expect(rows).toEqual([
      { tagId: "tag-sql", category: "Backend", order: 0, resumeSectionId: "section-1" },
    ]);
  });

  it("caps categories and skills per category at the app limits", async () => {
    const tooManyCategories = Array.from(
      { length: APP_CONSTANTS.MAX_SKILL_CATEGORIES + 3 },
      (_, c) => ({
        label: `cat-${c}`,
        skills: Array.from(
          { length: APP_CONSTANTS.MAX_SKILLS_PER_CATEGORY + 5 },
          (_, s) => `c${c}s${s}`,
        ),
      }),
    );

    await resolveImportCard("resume-1", {
      type: "skills",
      data: { categories: tooManyCategories },
    } as any);

    const rows = (prisma.skill.createMany as any).mock.calls[0][0].data;
    const categories = new Set(rows.map((r: any) => r.category));
    expect(categories.size).toBe(APP_CONSTANTS.MAX_SKILL_CATEGORIES);
    expect(rows).toHaveLength(
      APP_CONSTANTS.MAX_SKILL_CATEGORIES * APP_CONSTANTS.MAX_SKILLS_PER_CATEGORY,
    );
  });

  it("fails when there are no usable skills (no section created)", async () => {
    const result = await resolveImportCard("resume-1", {
      type: "skills",
      data: { categories: [{ label: "X", skills: ["  "] }] },
    } as any);

    expect(result.success).toBe(false);
    expect(prisma.resumeSection.create).not.toHaveBeenCalled();
    expect(prisma.skill.createMany).not.toHaveBeenCalled();
  });

  it("rejects when the resume is not owned by the user", async () => {
    (prisma.resume.findUnique as any).mockResolvedValue(null);

    const result = await resolveImportCard("resume-1", {
      type: "skills",
      data: { categories: [{ skills: ["React"] }] },
    } as any);

    expect(result.success).toBe(false);
    expect(prisma.resumeSection.create).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated users", async () => {
    (getCurrentUser as any).mockResolvedValue(null);

    const result = await resolveImportCard("resume-1", {
      type: "skills",
      data: { categories: [{ skills: ["React"] }] },
    } as any);

    expect(result.success).toBe(false);
    expect(prisma.resume.findUnique).not.toHaveBeenCalled();
  });

  it("reuses an existing tag instead of creating a duplicate", async () => {
    (prisma.tag.findUnique as any).mockResolvedValue({
      id: "existing-tag",
      label: "React",
      value: "react",
      createdBy: mockUser.id,
    });

    await resolveImportCard("resume-1", {
      type: "skills",
      data: { categories: [{ skills: ["React"] }] },
    } as any);

    expect(prisma.tag.create).not.toHaveBeenCalled();
    const rows = (prisma.skill.createMany as any).mock.calls[0][0].data;
    expect(rows[0].tagId).toBe("existing-tag");
  });
});
