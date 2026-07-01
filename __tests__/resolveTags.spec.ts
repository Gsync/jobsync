import { resolveTags } from "@/lib/jobs/resolve";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    tag: { findUnique: vi.fn(), create: vi.fn() },
  };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});

describe("resolveTags", () => {
  const userId = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();
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

  it("resolves each unique label to a tag", async () => {
    const result = await resolveTags(["React", "TypeScript"], userId, 10);

    expect(result.resolved).toHaveLength(2);
    expect(result.resolved.map((r) => r.label)).toEqual(["React", "TypeScript"]);
    expect(result.dropped).toEqual([]);
  });

  it("dedupes case-insensitively and trims whitespace", async () => {
    const result = await resolveTags(["  React ", "react", "REACT"], userId, 10);

    expect(prisma.tag.findUnique).toHaveBeenCalledTimes(1);
    expect(result.resolved).toHaveLength(1);
    expect(result.resolved[0].label).toBe("React");
  });

  it("drops empty/whitespace-only labels", async () => {
    const result = await resolveTags(["React", "", "   "], userId, 10);

    expect(result.resolved).toHaveLength(1);
    expect(result.resolved[0].label).toBe("React");
  });

  it("caps resolution at maxTags and reports the rest as dropped", async () => {
    const result = await resolveTags(["A", "B", "C", "D"], userId, 2);

    expect(result.resolved).toHaveLength(2);
    expect(result.resolved.map((r) => r.label)).toEqual(["A", "B"]);
    expect(result.dropped).toEqual(["C", "D"]);
    expect(prisma.tag.create).toHaveBeenCalledTimes(2);
  });

  it("reuses an existing tag instead of creating a duplicate", async () => {
    (prisma.tag.findUnique as any).mockResolvedValue({
      id: "existing-tag",
      label: "React",
      value: "react",
      createdBy: userId,
    });

    const result = await resolveTags(["React"], userId, 10);

    expect(prisma.tag.create).not.toHaveBeenCalled();
    expect(result.resolved[0]).toEqual({
      id: "existing-tag",
      label: "React",
      value: "react",
      createdBy: userId,
      created: false,
    });
  });

  it("returns empty resolved/dropped for an empty input array", async () => {
    const result = await resolveTags([], userId, 10);

    expect(result.resolved).toEqual([]);
    expect(result.dropped).toEqual([]);
    expect(prisma.tag.findUnique).not.toHaveBeenCalled();
  });
});
