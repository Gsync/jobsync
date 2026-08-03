import prisma from "@/lib/db";
import { resumeDetailInclude } from "@/lib/jobs/resumeDetailInclude";
import type { AgentResumeSource } from "@/models/agent.model";
import type { Resume } from "@/models/profile.model";

export type ResumeLookup =
  | { status: "ok"; resume: Resume; source: AgentResumeSource; ambiguousTitle: boolean }
  | { status: "needs_selection"; resumes: { id: string; title: string }[] }
  | { status: "no_resumes" };

// SQLite has no `mode: "insensitive"` in Prisma, so title matching happens
// in JS over this list. It is also exactly what the picker renders, so the
// query is not extra work.
async function listTitles(userId: string) {
  return prisma.resume.findMany({
    where: { profile: { userId } },
    select: { id: true, title: true },
    orderBy: { updatedAt: "desc" },
  });
}

async function load(
  userId: string,
  id: string,
  source: AgentResumeSource,
  ambiguousTitle = false,
): Promise<ResumeLookup | null> {
  const resume = await prisma.resume.findFirst({
    where: { id, profile: { userId } },
    include: resumeDetailInclude,
  });
  if (!resume) return null;
  // Prisma's generated shape is structurally what preprocessResume reads but
  // is not nominally profile.model's Resume — same cast as
  // getDefaultResumeForUser.
  return {
    status: "ok",
    resume: resume as unknown as Resume,
    source,
    ambiguousTitle,
  };
}

export async function resolveResumeForAgent(
  userId: string,
  opts: { title?: string; pageResumeId?: string },
): Promise<ResumeLookup> {
  const titles = await listTitles(userId);
  if (titles.length === 0) return { status: "no_resumes" };

  const wanted = opts.title?.trim().toLowerCase();
  if (wanted) {
    const exact = titles.filter((r) => r.title.toLowerCase() === wanted);
    // Duplicate titles resolve to the most recently updated rather than
    // asking again: the picker answers with a title, so a second question
    // would loop forever.
    const matches = exact.length > 0
      ? exact
      : titles.filter((r) => r.title.toLowerCase().includes(wanted));
    if (matches.length > 0) {
      const loaded = await load(userId, matches[0].id, "named", matches.length > 1);
      if (loaded) return loaded;
    }
    return { status: "needs_selection", resumes: titles };
  }

  // Ownership comes from the scoped listing above, never from the id itself
  // — pageContext is client-supplied.
  if (opts.pageResumeId && titles.some((r) => r.id === opts.pageResumeId)) {
    const loaded = await load(userId, opts.pageResumeId, "page");
    if (loaded) return loaded;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultResumeId: true },
  });
  const defaultId = user?.defaultResumeId;
  if (defaultId && titles.some((r) => r.id === defaultId)) {
    const loaded = await load(userId, defaultId, "default");
    if (loaded) return loaded;
  }

  if (titles.length === 1) {
    const loaded = await load(userId, titles[0].id, "only");
    if (loaded) return loaded;
  }

  return { status: "needs_selection", resumes: titles };
}
