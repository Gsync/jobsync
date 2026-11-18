import prisma from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";
import { findExistingJobByUrl, findJobIdsByNames } from "@/lib/jobs/jobDedupe";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import type { McpFindJobInput, McpToolResult } from "@/models/mcp.schema";

const matchSelect = {
  id: true,
  jobUrl: true,
  createdAt: true,
  descriptionCompleteness: true,
  matchScore: true,
  createdVia: true,
  Status: { select: { value: true } },
  JobTitle: { select: { label: true } },
  Company: { select: { label: true } },
  Location: { select: { label: true } },
  tags: { select: { label: true } },
} as const;

interface MatchRow {
  id: string;
  jobUrl: string | null;
  createdAt: Date;
  descriptionCompleteness: string | null;
  matchScore: number | null;
  createdVia: string | null;
  Status: { value: string };
  JobTitle: { label: string };
  Company: { label: string };
  Location: { label: string } | null;
  tags: Array<{ label: string }>;
}

export async function handleFindJob(
  input: McpFindJobInput,
  userId: string,
): Promise<McpToolResult> {
  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    const resetSec = Math.ceil(rateCheck.resetIn / 1000);
    return {
      content: [{ type: "text", text: `Rate limit exceeded. Try again in ${resetSec}s.` }],
    };
  }

  try {
    const { ids, urlMatchId } = await findMatchIds(input, userId);
    if (ids.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No saved job matches — call add_job to create it.",
          },
        ],
        structuredContent: { matches: [] },
      };
    }

    const fetched: MatchRow[] = await prisma.job.findMany({
      where: { id: { in: ids }, userId },
      select: matchSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    // Restore findMatchIds' order so the URL match stays first
    const rows = [...fetched].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    const matches = rows.map((row) => ({
      row,
      matchedBy: row.id === urlMatchId ? ("url" as const) : ("name" as const),
    }));

    return {
      content: [{ type: "text", text: describeMatches(matches) }],
      structuredContent: { matches: matches.map(toMatchFields) },
    };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err?.message ?? "Unknown error"}` }],
    };
  }
}

type MatchedBy = "url" | "name";

interface Match {
  row: MatchRow;
  matchedBy: MatchedBy;
}

// URL match first, then every company/title(/location) match, without repeats.
async function findMatchIds(
  input: McpFindJobInput,
  userId: string,
): Promise<{ ids: string[]; urlMatchId: string | null }> {
  const byUrl = input.jobUrl ? await findExistingJobByUrl(userId, input.jobUrl) : null;
  const hasNames = Boolean(input.company || input.jobTitle);
  const byNames = hasNames ? await findJobIdsByNames(userId, input) : [];
  const ids = [...new Set([...(byUrl ? [byUrl.id] : []), ...byNames])].slice(
    0,
    APP_CONSTANTS.MCP_FIND_JOB_MAX_MATCHES,
  );
  return { ids, urlMatchId: byUrl?.id ?? null };
}

function toMatchFields({ row, matchedBy }: Match) {
  return {
    id: row.id,
    title: row.JobTitle.label,
    company: row.Company.label,
    location: row.Location?.label ?? null,
    status: row.Status.value,
    createdAt: row.createdAt.toISOString(),
    jobUrl: row.jobUrl,
    updatable: row.createdVia != null,
    matchedBy,
  };
}

const MATCHED_BY_NOTE: Record<MatchedBy, string> = {
  url: "matched by URL: already saved, do not add it again",
  name:
    "matched by name only: possibly a different or newer posting — compare " +
    "location, saved date and URL; if it is a re-post, add_job with allowDuplicate: true",
};

function describeMatch({ row, matchedBy }: Match): string {
  const location = row.Location ? ` (${row.Location.label})` : "";
  const score = row.matchScore != null ? `${row.matchScore}%` : "not scored";
  // update_job replaces tags wholesale (no merge) — surface the current
  // list so an agent that wants to keep them can echo them back.
  const tags = row.tags.length ? row.tags.map((t) => t.label).join(", ") : "none";
  const editable =
    row.createdVia != null
      ? "updatable via update_job"
      : "created in the web app and cannot be updated via MCP — edit it there instead";
  return (
    `- "${row.JobTitle.label}" at "${row.Company.label}"${location} ` +
    `(id: ${row.id}, status: ${row.Status.value}, ` +
    `saved: ${row.createdAt.toISOString().slice(0, 10)}, ` +
    `url: ${row.jobUrl ?? "none"}, ` +
    `description: ${row.descriptionCompleteness ?? "unknown"}, ` +
    `match: ${score}, tags: ${tags}) — ${MATCHED_BY_NOTE[matchedBy]}; ${editable}.`
  );
}

function describeMatches(matches: Match[]): string {
  return (
    `Found ${matches.length} saved job(s):\n` +
    matches.map(describeMatch).join("\n") +
    `\nTo enrich or correct one, call ` +
    `update_job with its id. Tags are replaced wholesale, not merged — ` +
    `include the existing ones above if you want to keep them.`
  );
}
