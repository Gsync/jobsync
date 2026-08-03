import { z } from "zod";
import { McpAddJobInputShape } from "@/models/mcp.schema";

export const AgentChatRequestSchema = z.object({
  // Validated by the SDK downstream, not here. The whole array is
  // client-supplied; nothing in it widens what the request can touch,
  // because userId always comes from the session.
  messages: z.array(z.any()),
  pageContext: z
    .object({
      route: z.string().optional(),
      jobId: z.string().optional(),
      resumeId: z.string().optional(),
    })
    .optional(),
});

export type AgentChatRequest = z.infer<typeof AgentChatRequestSchema>;

// Derived from the MCP RAW shape, not McpAddJobSchema: AI SDK's tool()
// uses one schema for both the JSON schema the model reads and the
// validation of what it returns, so the date transforms are deferred to
// AgentAddJobParseSchema. status keeps its z.preprocess — that is what
// keeps enum: [...] on the input side of the emitted JSON schema.
export const AgentAddJobSchema = z
  .object(McpAddJobInputShape)
  .omit({ upsert: true, allowDuplicate: true })
  .extend({
    jobDescription: z.string().min(10).optional().describe("What the job involves, in the user's own words. If the user typed the job's details into the chat, put their description of the role here verbatim, even if it is only one sentence — it does not need to look like a full posting, and it must not be condensed into tags instead. If the user pasted a posting, omit this field entirely — the app splices their pasted text in verbatim."),
  });

export const AgentAddJobInputShape = AgentAddJobSchema.shape;

// Parsed inside execute, after the model's input has been validated.
export const AgentAddJobParseSchema = AgentAddJobSchema.extend({
  dueDate: z.string().datetime({ offset: true }).optional().transform((v) => (v ? new Date(v) : undefined)),
  appliedDate: z.string().datetime({ offset: true }).optional().transform((v) => (v ? new Date(v) : undefined)),
});

export type AgentAddJobInput = z.infer<typeof AgentAddJobParseSchema>;

// One optional field, and never an id: the model names a resume the way the
// user did, and the server resolves it ownership-scoped. An id-shaped input
// would be an IDOR surface the model could be talked into filling.
export const AgentGetResumeSchema = z.object({
  resumeTitle: z.string().optional().describe("The title of the resume to read, as the user referred to it. Omit this entirely if the user did not name one — the app then uses the resume they are currently viewing, or their default resume."),
});

export type AgentGetResumeInput = z.infer<typeof AgentGetResumeSchema>;
