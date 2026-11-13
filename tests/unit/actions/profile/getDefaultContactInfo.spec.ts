import { getDefaultContactInfo } from "@/actions/profile.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@/generated/prisma/client";

const prisma = new PrismaClient({} as never);

vi.mock("@/generated/prisma/client", () => {
  const mPrismaClient = {
    user: { findUnique: vi.fn() },
    contactInfo: { findFirst: vi.fn() },
  };
  return { PrismaClient: vi.fn(function () { return mPrismaClient; }) };
});

vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("getDefaultContactInfo", () => {
  const mockUser = { id: "user-id" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when there is no session user", async () => {
    (getCurrentUser as any).mockResolvedValue(null);
    expect(await getDefaultContactInfo()).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when the user has no default resume", async () => {
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.user.findUnique as any).mockResolvedValue({
      defaultResumeId: null,
    });
    expect(await getDefaultContactInfo()).toBeNull();
    expect(prisma.contactInfo.findFirst).not.toHaveBeenCalled();
  });

  it("returns null when the default resume has no contact info", async () => {
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.user.findUnique as any).mockResolvedValue({
      defaultResumeId: "resume-1",
    });
    (prisma.contactInfo.findFirst as any).mockResolvedValue(null);
    expect(await getDefaultContactInfo()).toBeNull();
  });

  // IDOR: the contact info is never read by resume id alone.
  it("scopes the read through the profile.userId ownership chain", async () => {
    (getCurrentUser as any).mockResolvedValue(mockUser);
    (prisma.user.findUnique as any).mockResolvedValue({
      defaultResumeId: "resume-1",
    });
    (prisma.contactInfo.findFirst as any).mockResolvedValue({
      id: "ci-1",
      firstName: "Ada",
    });

    const result = await getDefaultContactInfo();

    expect(result).toEqual({ id: "ci-1", firstName: "Ada" });
    expect(prisma.contactInfo.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          resumeId: "resume-1",
          resume: { profile: { userId: "user-id" } },
        },
      }),
    );
  });
});
