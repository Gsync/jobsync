import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { resolveMcpToken } from "@/lib/mcp/auth";
import { MCP_TOOL_DESCRIPTIONS } from "@/lib/mcp/toolDescriptions";
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
    MCP_TOOL_DESCRIPTIONS.add_job,
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
    MCP_TOOL_DESCRIPTIONS.find_job,
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
    MCP_TOOL_DESCRIPTIONS.update_job,
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
    MCP_TOOL_DESCRIPTIONS.add_question,
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
    MCP_TOOL_DESCRIPTIONS.save_match_result,
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
    MCP_TOOL_DESCRIPTIONS.add_jobs_batch,
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
    MCP_TOOL_DESCRIPTIONS.save_match_results_batch,
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
    MCP_TOOL_DESCRIPTIONS.review_resume,
    McpReviewResumeInputShape,
    async () => {
      return handleReviewResume(userId);
    },
  );

  server.tool(
    "save_resume_review",
    MCP_TOOL_DESCRIPTIONS.save_resume_review,
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
