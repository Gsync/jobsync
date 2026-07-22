import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { resolveMcpToken } from "@/lib/mcp/auth";
import {
  McpAddJobInputShape,
  McpAddJobSchema,
  McpAddQuestionInputShape,
  McpAddQuestionSchema,
  McpSaveMatchResultInputShape,
  McpSaveMatchResultSchema,
  McpReviewResumeInputShape,
  McpReviewResumeSchema,
  McpSaveResumeReviewInputShape,
  McpSaveResumeReviewSchema,
  McpFindJobInputShape,
  McpFindJobSchema,
  McpUpdateJobInputShape,
  McpUpdateJobSchema,
  McpAddJobsBatchInputShape,
  McpAddJobsBatchSchema,
  McpSaveMatchResultsBatchInputShape,
  McpSaveMatchResultsBatchSchema,
} from "@/models/mcp.schema";
import { handleAddJob } from "@/lib/mcp/tools/addJob";
import { handleAddQuestion } from "@/lib/mcp/tools/addQuestion";
import { handleSaveMatchResult } from "@/lib/mcp/tools/saveMatchResult";
import { handleReviewResume } from "@/lib/mcp/tools/reviewResume";
import { handleSaveResumeReview } from "@/lib/mcp/tools/saveResumeReview";
import { handleFindJob } from "@/lib/mcp/tools/findJob";
import { handleUpdateJob } from "@/lib/mcp/tools/updateJob";
import { handleAddJobsBatch } from "@/lib/mcp/tools/addJobsBatch";
import { handleSaveMatchResultsBatch } from "@/lib/mcp/tools/saveMatchResultsBatch";

function isMcpEnabled(): boolean {
  const env = process.env.MCP_ENABLED;
  if (env === "true") return true;
  if (env === "false") return false;
  // Default: on in dev, off in production
  return process.env.NODE_ENV !== "production";
}

async function handler(req: Request): Promise<Response> {
  if (!isMcpEnabled()) {
    return new Response("Not Found", { status: 404 });
  }

  const auth = await resolveMcpToken(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { userId, tokenName } = auth;

  const server = new McpServer({ name: "jobsync", version: "1.0.0" });

  server.tool(
    "add_job",
    "Add a job application to JobSync. Resolves or creates company, job title, location, and source by name. Returns a transparency report of what was matched vs. created.",
    McpAddJobInputShape,
    async (rawInput) => {
      if (!auth.scopes.includes("jobs:write")) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Insufficient scope. Required: jobs:write",
            },
          ],
        };
      }
      const parsed = McpAddJobSchema.safeParse(rawInput);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => i.message).join("; ");
        return {
          content: [
            { type: "text" as const, text: `Validation error: ${issues}` },
          ],
        };
      }
      return handleAddJob(parsed.data, userId, tokenName);
    },
  );

  server.tool(
    "find_job",
    "Look up whether a job posting URL is already saved in JobSync. Call this before add_job when re-running a search, so an already-tracked posting is updated instead of duplicated.",
    McpFindJobInputShape,
    async (rawInput) => {
      if (!auth.scopes.includes("jobs:write")) {
        return {
          content: [
            { type: "text" as const, text: "Insufficient scope. Required: jobs:write" },
          ],
        };
      }
      const parsed = McpFindJobSchema.safeParse(rawInput);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => i.message).join("; ");
        return {
          content: [{ type: "text" as const, text: `Validation error: ${issues}` }],
        };
      }
      return handleFindJob(parsed.data, userId);
    },
  );

  server.tool(
    "update_job",
    "Correct or enrich a job previously added through MCP. Only the fields you supply change. Supplying a fuller jobDescription re-classifies the posting and requests a fresh match analysis — use this instead of re-adding with allowDuplicate.",
    McpUpdateJobInputShape,
    async (rawInput) => {
      if (!auth.scopes.includes("jobs:write")) {
        return {
          content: [
            { type: "text" as const, text: "Insufficient scope. Required: jobs:write" },
          ],
        };
      }
      const parsed = McpUpdateJobSchema.safeParse(rawInput);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => i.message).join("; ");
        return {
          content: [{ type: "text" as const, text: `Validation error: ${issues}` }],
        };
      }
      return handleUpdateJob(parsed.data, userId);
    },
  );

  server.tool(
    "add_question",
    "Add an entry to the Question Bank. Resolves or creates tags by name. Returns a transparency report of what was matched vs. created.",
    McpAddQuestionInputShape,
    async (rawInput) => {
      if (!auth.scopes.includes("questions:write")) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Insufficient scope. Required: questions:write",
            },
          ],
        };
      }
      const parsed = McpAddQuestionSchema.safeParse(rawInput);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => i.message).join("; ");
        return {
          content: [
            { type: "text" as const, text: `Validation error: ${issues}` },
          ],
        };
      }
      return handleAddQuestion(parsed.data, userId, tokenName);
    },
  );

  server.tool(
    "save_match_result",
    "Persist a job-fit match analysis (produced by you, the agent) against a job previously created with add_job. Call this after add_job hands you a match directive.",
    McpSaveMatchResultInputShape,
    async (rawInput) => {
      if (!auth.scopes.includes("jobs:write")) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Insufficient scope. Required: jobs:write",
            },
          ],
        };
      }
      const parsed = McpSaveMatchResultSchema.safeParse(rawInput);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => i.message).join("; ");
        return {
          content: [
            { type: "text" as const, text: `Validation error: ${issues}` },
          ],
        };
      }
      return handleSaveMatchResult(parsed.data, userId, tokenName);
    },
  );

  server.tool(
    "add_jobs_batch",
    "Add several jobs in one call. Same per-item behaviour as add_job (including upsert and the match directive); returns one labelled result per item. Use this for scheduled runs instead of N sequential add_job calls.",
    McpAddJobsBatchInputShape,
    async (rawInput) => {
      if (!auth.scopes.includes("jobs:write")) {
        return {
          content: [
            { type: "text" as const, text: "Insufficient scope. Required: jobs:write" },
          ],
        };
      }
      const parsed = McpAddJobsBatchSchema.safeParse(rawInput);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => i.message).join("; ");
        return {
          content: [{ type: "text" as const, text: `Validation error: ${issues}` }],
        };
      }
      return handleAddJobsBatch(parsed.data, userId, tokenName);
    },
  );

  server.tool(
    "save_match_results_batch",
    "Persist several job-fit match analyses in one call. Same per-item behaviour as save_match_result; returns one labelled result per item.",
    McpSaveMatchResultsBatchInputShape,
    async (rawInput) => {
      if (!auth.scopes.includes("jobs:write")) {
        return {
          content: [
            { type: "text" as const, text: "Insufficient scope. Required: jobs:write" },
          ],
        };
      }
      const parsed = McpSaveMatchResultsBatchSchema.safeParse(rawInput);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => i.message).join("; ");
        return {
          content: [{ type: "text" as const, text: `Validation error: ${issues}` }],
        };
      }
      return handleSaveMatchResultsBatch(parsed.data, userId, tokenName);
    },
  );

  // No scope gate, intentionally — unlike the tools above, review_resume and
  // save_resume_review have no `resume:write` check. Tokens created before
  // this feature shipped don't have that scope and must keep working (see
  // docs/plans/feature-mcp-resume-review.md, "Locked decisions"). Do not add
  // one without also backfilling existing tokens.
  server.tool(
    "review_resume",
    "Fetch the user's default resume so you can review it. Returns the normalized resume text plus a directive — produce the review yourself, then call save_resume_review with the result.",
    McpReviewResumeInputShape,
    async () => {
      return handleReviewResume(userId);
    },
  );

  server.tool(
    "save_resume_review",
    "Persist a resume review (produced by you, the agent) against the resume previously handed to you by review_resume. Call this after review_resume hands you a review directive.",
    McpSaveResumeReviewInputShape,
    async (rawInput) => {
      const parsed = McpSaveResumeReviewSchema.safeParse(rawInput);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => i.message).join("; ");
        return {
          content: [
            { type: "text" as const, text: `Validation error: ${issues}` },
          ],
        };
      }
      return handleSaveResumeReview(parsed.data, userId, tokenName);
    },
  );

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode
    enableJsonResponse: true, // return plain JSON instead of SSE stream
  });

  await server.connect(transport);
  const response = await transport.handleRequest(req);
  await server.close();

  return response;
}

// GET is for SSE server-push streams — not supported in stateless mode
async function getHandler(): Promise<Response> {
  return new Response("Method Not Allowed", { status: 405 });
}

export { getHandler as GET, handler as POST, handler as DELETE };
