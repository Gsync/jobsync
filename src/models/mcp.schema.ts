import { z } from "zod";
import { APP_CONSTANTS } from "@/lib/constants";

// Raw input shape for MCP tool registration (no transforms — SDK uses this for JSON schema)
export const McpAddJobInputShape = {
  company: z.string().min(1, "company is required"),
  jobTitle: z.string().min(1, "jobTitle is required"),
  jobDescription: z.string().min(10, "jobDescription must be at least 10 characters"),
  location: z.string().optional().describe("City, province/state, country, or 'Remote'"),
  source: z.string().optional().describe("Job board or site the listing came from, e.g. 'LinkedIn', 'Indeed', 'company website'"),
  jobType: z.string().optional().describe("Employment type: 'Full-time', 'Part-time', or 'Contract'"),
  workplaceType: z.string().optional().describe("Work arrangement: 'Remote', 'Hybrid', or 'Onsite'"),
  status: z.string().optional().describe("Application status: draft, applied, interview, offer, rejected, expired, or archived. Defaults to 'draft'"),
  dueDate: z.string().datetime({ offset: true }).optional().describe("Application deadline as an ISO-8601 datetime string"),
  applied: z.boolean().optional().describe("Set true if you have already submitted the application"),
  appliedDate: z.string().datetime({ offset: true }).optional().describe("Date the application was submitted as an ISO-8601 datetime string"),
  jobUrl: z.string().url().optional().describe("Direct URL to the job posting"),
  salaryRange: z.string().optional().describe("Salary range as a free-form string, e.g. '$120k–$150k' or '100,000 CAD'"),
  tags: z.array(z.string()).optional().describe("Skills required for the job (max 10 applied, extras are dropped). Tags are created if they don't exist. e.g. ['React', 'TypeScript', 'Node.js']"),
  allowDuplicate: z.boolean().optional(),
};

// Full schema with transforms for parsing raw MCP input in the handler
export const McpAddJobSchema = z.object({
  ...McpAddJobInputShape,
  dueDate: z.string().datetime({ offset: true }).optional().transform((v) => (v ? new Date(v) : undefined)),
  appliedDate: z.string().datetime({ offset: true }).optional().transform((v) => (v ? new Date(v) : undefined)),
});

export type McpAddJobInput = z.infer<typeof McpAddJobSchema>;

// Raw input shape for MCP tool registration (no transforms — SDK uses this for JSON schema)
export const McpAddQuestionInputShape = {
  question: z.string()
    .min(APP_CONSTANTS.MIN_QUESTION_LENGTH, `question must be at least ${APP_CONSTANTS.MIN_QUESTION_LENGTH} characters`)
    .max(APP_CONSTANTS.MAX_QUESTION_LENGTH, `question cannot exceed ${APP_CONSTANTS.MAX_QUESTION_LENGTH} characters`),
  answer: z.string()
    .min(APP_CONSTANTS.MIN_QUESTION_ANSWER_LENGTH, `answer must be at least ${APP_CONSTANTS.MIN_QUESTION_ANSWER_LENGTH} characters`)
    .max(APP_CONSTANTS.MAX_QUESTION_ANSWER_LENGTH, `answer cannot exceed ${APP_CONSTANTS.MAX_QUESTION_ANSWER_LENGTH} characters`)
    .describe("Markdown-formatted answer/notes (required). Plain text also works."),
  tags: z.array(z.string()).optional()
    .describe("Skill/topic tags (max 10 applied, extras dropped). Created if they don't exist."),
};

export const McpAddQuestionSchema = z.object(McpAddQuestionInputShape);
export type McpAddQuestionInput = z.infer<typeof McpAddQuestionSchema>;
