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
} from "@/models/mcp.schema";
import { handleAddJob } from "@/lib/mcp/tools/addJob";
import { handleAddQuestion } from "@/lib/mcp/tools/addQuestion";
import { handleSaveMatchResult } from "@/lib/mcp/tools/saveMatchResult";
import { handleReviewResume } from "@/lib/mcp/tools/reviewResume";
import { handleSaveResumeReview } from "@/lib/mcp/tools/saveResumeReview";
import { hasMcpScope, MCP_SCOPE } from "@/lib/mcp/scopes";

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
      if (!hasMcpScope(auth.scopes, MCP_SCOPE.JOBS_CREATE)) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Insufficient scope. Required: jobs:create",
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
    "add_question",
    "Add an entry to the Question Bank. Resolves or creates tags by name. Returns a transparency report of what was matched vs. created.",
    McpAddQuestionInputShape,
    async (rawInput) => {
      if (!hasMcpScope(auth.scopes, MCP_SCOPE.QUESTIONS_WRITE)) {
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
      if (!hasMcpScope(auth.scopes, MCP_SCOPE.MATCHES_WRITE)) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Insufficient scope. Required: matches:write",
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
    "review_resume",
    "Fetch the user's default resume so you can review it. Returns the normalized resume text plus a directive — produce the review yourself, then call save_resume_review with the result.",
    McpReviewResumeInputShape,
    async () => {
      if (!hasMcpScope(auth.scopes, MCP_SCOPE.RESUMES_READ)) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Insufficient scope. Required: resumes:read",
            },
          ],
        };
      }
      return handleReviewResume(userId);
    },
  );

  server.tool(
    "save_resume_review",
    "Persist a resume review (produced by you, the agent) against the resume previously handed to you by review_resume. Call this after review_resume hands you a review directive.",
    McpSaveResumeReviewInputShape,
    async (rawInput) => {
      if (!hasMcpScope(auth.scopes, MCP_SCOPE.RESUME_REVIEWS_WRITE)) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Insufficient scope. Required: resume-reviews:write",
            },
          ],
        };
      }
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
