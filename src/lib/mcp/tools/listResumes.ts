import prisma from "@/lib/db";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";

// List the caller's resumes (id + title), marking the default one. Agents use
// this to pick a resumeId for save_match_result / review_resume flows.
export async function handleListResumes(
  userId: string,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    const resetSec = Math.ceil(rateCheck.resetIn / 1000);
    return {
      content: [{ type: "text", text: `Rate limit exceeded. Try again in ${resetSec}s.` }],
    };
  }

  try {
    const userRow = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultResumeId: true },
    });
    const defaultResumeId = userRow?.defaultResumeId ?? null;

    const resumes = await prisma.resume.findMany({
      where: { profile: { userId } },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    if (resumes.length === 0) {
      return {
        content: [{ type: "text", text: "No resumes found. Create one in the web app first." }],
      };
    }

    const lines = resumes.map((r: any) => {
      const marker = r.id === defaultResumeId ? " (default)" : "";
      return `- ${r.title} (id: ${r.id})${marker} — updated ${new Date(r.updatedAt).toISOString()}`;
    });

    const text = `Found ${resumes.length} resume(s):\n${lines.join("\n")}`;
    return { content: [{ type: "text", text }] };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err?.message ?? "Unknown error"}` }],
    };
  }
}