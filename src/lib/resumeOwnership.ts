import prisma from "@/lib/db";

/** Canonical IDOR guard: resume must exist and belong to the given user. */
export const assertResumeOwnership = async (
  resumeId: string,
  userId: string,
) => {
  const owned = await prisma.resume.findUnique({
    where: { id: resumeId, profile: { userId } },
    select: { id: true },
  });
  if (!owned) throw new Error("Resume not found or access denied");
};
