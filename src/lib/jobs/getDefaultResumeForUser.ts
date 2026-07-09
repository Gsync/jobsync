import prisma from "@/lib/db";
import { Resume } from "@/models/profile.model";
import { resumeDetailInclude } from "@/lib/jobs/resumeDetailInclude";

// Session-less equivalent of getDefaultResumeById + getResumeById, for the
// MCP path where there is no auth() session to derive the user from — see
// docs/plans/feature-mcp-add-job-match.md ("Session-less constraint").
export async function getDefaultResumeForUser(
  userId: string,
): Promise<Resume | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultResumeId: true },
  });
  if (!user?.defaultResumeId) return null;

  const resume = await prisma.resume.findFirst({
    where: { id: user.defaultResumeId, profile: { userId } },
    include: resumeDetailInclude,
  });
  if (!resume) return null;

  // Prisma's generated shape is structurally what preprocessResume reads
  // (ContactInfo, ResumeSections, title) but isn't nominally the profile.model
  // Resume type (e.g. sectionType is a plain string vs. the SectionType enum).
  // Mirrors the in-app path: getResumeById returns `any` to the same effect.
  return resume as unknown as Resume;
}
