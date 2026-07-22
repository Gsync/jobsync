import path from "path";
import prisma from "@/lib/db";
import {
  getOwnedResumeFile,
  isPathInsideUploads,
} from "@/lib/resumes/ownedResumeFile";

vi.mock("@/lib/db", () => ({
  default: {
    resume: {
      findFirst: vi.fn(),
    },
  },
}));

describe("owned resume download lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries by resume id and profile owner", async () => {
    const filePath = path.resolve("data/files/resumes/safe.pdf");
    (prisma.resume.findFirst as any).mockResolvedValue({
      File: { filePath, fileName: "safe.pdf" },
    });

    await expect(getOwnedResumeFile("user-1", "resume-1")).resolves.toEqual({
      filePath,
      fileName: "safe.pdf",
    });
    expect(prisma.resume.findFirst).toHaveBeenCalledWith({
      where: {
        id: "resume-1",
        profile: { userId: "user-1" },
      },
      select: {
        File: {
          select: {
            filePath: true,
            fileName: true,
          },
        },
      },
    });
  });

  it("rejects missing, cross-user, or path-escaped records", async () => {
    (prisma.resume.findFirst as any).mockResolvedValue(null);
    await expect(
      getOwnedResumeFile("user-1", "other-resume"),
    ).resolves.toBeNull();

    (prisma.resume.findFirst as any).mockResolvedValue({
      File: {
        filePath: path.resolve("../secret.pdf"),
        fileName: "secret.pdf",
      },
    });
    await expect(
      getOwnedResumeFile("user-1", "resume-1"),
    ).resolves.toBeNull();
  });

  it("accepts only paths inside the configured uploads root", () => {
    expect(isPathInsideUploads(path.resolve("data/files/resumes/safe.pdf"))).toBe(
      true,
    );
    expect(isPathInsideUploads(path.resolve("../secret.pdf"))).toBe(false);
  });
});
