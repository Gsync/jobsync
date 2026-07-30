import { addContactInfo, updateContactInfo } from "@/actions/profile.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const mPrismaClient = {
    resume: { update: vi.fn() },
    contactInfo: { update: vi.fn() },
  };
  return {
    PrismaClient: vi.fn(function () {
      return mPrismaClient;
    }),
  };
});

vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const baseForm = {
  resumeId: "resume-1",
  firstName: "Ada",
  lastName: "Lovelace",
  headline: "Engineer",
  email: "ada@example.com",
  phone: "555-0100",
  address: "London",
  url1: "https://linkedin.com/in/ada",
  url1Label: "LinkedIn",
  url2: "",
  url2Label: "",
};

describe("addContactInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue({ id: "user-1" });
  });

  it("scopes the write to a resume the user owns", async () => {
    (prisma.resume.update as any).mockResolvedValue({ id: "resume-1" });

    const result = await addContactInfo(baseForm as any);

    expect(result.success).toBe(true);
    expect((prisma.resume.update as any).mock.calls[0][0].where).toEqual({
      id: "resume-1",
      profile: { userId: "user-1" },
    });
  });

  it("connectOrCreates on the resume so a second save does not duplicate", async () => {
    (prisma.resume.update as any).mockResolvedValue({ id: "resume-1" });

    await addContactInfo(baseForm as any);

    const { ContactInfo } = (prisma.resume.update as any).mock.calls[0][0].data;
    expect(ContactInfo.connectOrCreate.where).toEqual({ resumeId: "resume-1" });
    expect(ContactInfo.connectOrCreate.create).toEqual(
      expect.objectContaining({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "555-0100",
      }),
    );
  });

  it("stores blank links as null rather than empty strings", async () => {
    (prisma.resume.update as any).mockResolvedValue({ id: "resume-1" });

    await addContactInfo(baseForm as any);

    const { create } = (prisma.resume.update as any).mock.calls[0][0].data
      .ContactInfo.connectOrCreate;
    expect(create.url1).toBe("https://linkedin.com/in/ada");
    expect(create.url1Label).toBe("LinkedIn");
    expect(create.url2).toBeNull();
    expect(create.url2Label).toBeNull();
  });

  it("fails without writing when unauthenticated", async () => {
    (getCurrentUser as any).mockResolvedValue(null);

    const result = await addContactInfo(baseForm as any);

    expect(result).toEqual({ success: false, message: "Not authenticated" });
    expect(prisma.resume.update).not.toHaveBeenCalled();
  });

  it("returns a failure result when the resume is not owned", async () => {
    (prisma.resume.update as any).mockRejectedValue(
      new Error("Record to update not found."),
    );

    const result = await addContactInfo(baseForm as any);

    expect(result.success).toBe(false);
  });
});

describe("updateContactInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue({ id: "user-1" });
  });

  it("scopes the update through the resume ownership chain", async () => {
    (prisma.contactInfo.update as any).mockResolvedValue({ id: "contact-1" });

    const result = await updateContactInfo({
      ...baseForm,
      id: "contact-1",
    } as any);

    expect(result.success).toBe(true);
    expect((prisma.contactInfo.update as any).mock.calls[0][0].where).toEqual({
      id: "contact-1",
      resume: { profile: { userId: "user-1" } },
    });
  });

  it("clears a removed second link back to null", async () => {
    (prisma.contactInfo.update as any).mockResolvedValue({ id: "contact-1" });

    await updateContactInfo({
      ...baseForm,
      id: "contact-1",
      url2: "",
      url2Label: "",
    } as any);

    const { data } = (prisma.contactInfo.update as any).mock.calls[0][0];
    expect(data.url2).toBeNull();
    expect(data.url2Label).toBeNull();
  });

  it("fails without writing when unauthenticated", async () => {
    (getCurrentUser as any).mockResolvedValue(null);

    const result = await updateContactInfo({
      ...baseForm,
      id: "contact-1",
    } as any);

    expect(result).toEqual({ success: false, message: "Not authenticated" });
    expect(prisma.contactInfo.update).not.toHaveBeenCalled();
  });
});
