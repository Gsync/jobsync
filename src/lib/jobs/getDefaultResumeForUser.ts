import prisma from "@/lib/db";
import { Resume } from "@/models/profile.model";
import { resumeDetailInclude } from "@/lib/jobs/resumeDetailInclude";

async function defaultResumeWhere(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultResumeId: true },
  });
  return user?.defaultResumeId ? { id: user.defaultResumeId, profile: { userId } } : null;
}

export async function getDefaultResumeRefForUser(userId: string): Promise<{ id: string; title: string } | null> {
  const where = await defaultResumeWhere(userId);
  if (!where) return null;
  return prisma.resume.findFirst({ where, select: { id: true, title: true } });
}

// Session-less equivalent of getDefaultResumeById + getResumeById, for the
// MCP path where there is no auth() session to derive the user from — see
// docs/plans/feature-mcp-add-job-match.md ("Session-less constraint").
export async function getDefaultResumeForUser(
  userId: string,
): Promise<Resume | null> {
  const where = await defaultResumeWhere(userId);
  if (!where) return null;

  const resume = await prisma.resume.findFirst({
    where,
    include: resumeDetailInclude,
  });
  if (!resume) return null;

  // Prisma's generated shape is structurally what preprocessResume reads
  // (ContactInfo, ResumeSections, title) but isn't nominally the profile.model
  // Resume type (e.g. sectionType is a plain string vs. the SectionType enum).
  // Mirrors the in-app path: getResumeById returns `any` to the same effect.
  return resume as unknown as Resume;
}
