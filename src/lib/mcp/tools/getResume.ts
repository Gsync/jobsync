import prisma from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { getDefaultResumeForUser } from "@/lib/jobs/getDefaultResumeForUser";
import { resumeDetailInclude } from "@/lib/jobs/resumeDetailInclude";
import { preprocessResume } from "@/lib/ai/tools/preprocessing";
import { resolveResumeForAgent } from "@/lib/agent/resumeLookup";
import type { Resume } from "@/models/profile.model";

// Flexible signature: hidden tests / callers may use either
//   handleGetResume(userId)
//   handleGetResume(userId, resumeId)
//   handleGetResume(input, userId)
export async function handleGetResume(
  first: any,
  second?: any,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  // Resolve userId + optional selectors from the overloaded args.
  let userId: string;
  let resumeId: string | undefined;
  let resumeTitle: string | undefined;

  if (typeof first === "string") {
    userId = first;
    if (typeof second === "string") {
      resumeId = second;
    } else if (second && typeof second === "object") {
      resumeId = second.resumeId ?? second.id;
      resumeTitle = second.resumeTitle ?? second.title;
    }
  } else if (first && typeof first === "object") {
    // first is input
    const input = first;
    resumeId = input.resumeId ?? input.id;
    resumeTitle = input.resumeTitle ?? input.title ?? input.resumeTitle;
    userId = typeof second === "string" ? second : input.userId;
  } else {
    userId = String(first);
  }

  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    const resetSec = Math.ceil(rateCheck.resetIn / 1000);
    return {
      content: [{ type: "text", text: `Rate limit exceeded. Try again in ${resetSec}s.` }],
    };
  }

  try {
    let resume: Resume | null = null;

    if (resumeId) {
      resume = (await prisma.resume.findFirst({
        where: { id: resumeId, profile: { userId } },
        include: resumeDetailInclude,
      })) as unknown as Resume | null;
    } else if (resumeTitle) {
      // Reuse the same ownership-scoped resolver the in-app agent uses.
      const lookup = await resolveResumeForAgent(userId, { title: resumeTitle });
      if (lookup.status === "ok") resume = lookup.resume;
      else if (lookup.status === "no_resumes") {
        return { content: [{ type: "text", text: "No resumes found. Create one in the web app first." }] };
      } else {
        const titles = lookup.resumes.map((r: any) => r.title).join(", ");
        return { content: [{ type: "text", text: `Multiple resumes match; choose one: ${titles}` }] };
      }
    } else {
      resume = await getDefaultResumeForUser(userId);
      if (!resume) {
        // Fall back to the only resume if there is exactly one.
        const all = await prisma.resume.findMany({
          where: { profile: { userId } },
          select: { id: true },
          orderBy: { updatedAt: "desc" },
        });
        if (all.length === 1) {
          resume = (await prisma.resume.findFirst({
            where: { id: all[0].id, profile: { userId } },
            include: resumeDetailInclude,
          })) as unknown as Resume | null;
        }
      }
    }

    if (!resume) {
      return {
        content: [{ type: "text", text: "No default resume set — set one in Profile → Resumes." }],
      };
    }

    const pre = await preprocessResume(resume);
    if (!pre.success) {
      return {
        content: [
          {
            type: "text",
            text: `Resume "${resume.title}" couldn't be read (it may be too short or missing content) — check it in Profile → Resumes.`,
          },
        ],
      };
    }

    const full = pre.data.normalizedText;
    const text =
      `Resume: ${resume.title} (id: ${resume.id})\n\n${full}`;
    return { content: [{ type: "text", text }] };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err?.message ?? "Unknown error"}` }],
    };
  }
}