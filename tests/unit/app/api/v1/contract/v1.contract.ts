// Hand-edited. A failure means the code broke the v1 promise; fix the code.
// Never regenerate (root CLAUDE.md, Public API v1).
import type { FieldType } from "./contractCheck";

const wiki = "wiki/api.md";
const extension = "docs/implemented/2026-11-15-browser-extension.md";
const minimal = { company: "Acme", jobTitle: "API Test Engineer" };
const defaultJob = { ...minimal, jobDescription: "N/A" };
const curl = { ...minimal, jobUrl: "https://example.com/jobs/1", via: "curl" };
const extensionJob = {
  ...minimal, location: "Calgary, AB", workplaceType: "Hybrid", salaryRange: "CAD 90k–110k",
  jobUrl: "https://example.com/jobs/1", status: "draft",
  jobDescription: "## Responsibilities\n\n- Test public APIs", source: "Greenhouse",
};

export const V1_REQUESTS: {
  name: string; source: string; body: unknown; parsed: Record<string, unknown>;
}[] = [
  { name: "wiki curl example", source: wiki, body: curl, parsed: { ...curl, jobDescription: "N/A" } },
  { name: "minimal", source: wiki, body: minimal, parsed: defaultJob },
  { name: "extension save", source: extension, body: extensionJob, parsed: extensionJob },
  {
    name: "extension save anyway", source: extension,
    body: { ...extensionJob, allowDuplicate: true }, parsed: { ...extensionJob, allowDuplicate: true },
  },
  {
    name: "blank optionals", source: wiki,
    body: {
      ...minimal, jobDescription: "", jobUrl: "", location: "", source: "", jobType: "",
      workplaceType: "", salaryRange: "", status: "", via: "",
    },
    parsed: defaultJob,
  },
  {
    name: "unknown keys", source: "root CLAUDE.md, Public API v1",
    body: { ...minimal, tags: ["React"], dueDate: "2026-12-01", extensionVersion: "1.0.0" },
    parsed: defaultJob,
  },
  {
    name: "mixed-case enums", source: wiki,
    body: { ...minimal, jobType: "full time", workplaceType: "REMOTE", status: "Applied" },
    parsed: { ...defaultJob, jobType: "Full-time", workplaceType: "Remote", status: "applied" },
  },
];

type ResponseName = "created" | "duplicate" | "validationError" | "rateLimited"
  | "unauthorized" | "forbidden" | "ping";

export const V1_RESPONSES: Record<ResponseName, { status: number; fields: Record<string, FieldType> }> = {
  created: {
    status: 201,
    fields: { created: "boolean", jobId: "string", jobPath: "string", descriptionCompleteness: "string" },
  },
  duplicate: {
    status: 409,
    fields: {
      created: "boolean", duplicateOf: "object", "duplicateOf.id": "string",
      "duplicateOf.title": "string", "duplicateOf.company": "string", jobPath: "string",
    },
  },
  validationError: {
    status: 400,
    fields: { error: "string", issues: "array", "issues[].path": "string", "issues[].message": "string" },
  },
  rateLimited: { status: 429, fields: { error: "string", retryAfterSeconds: "number" } },
  unauthorized: { status: 401, fields: { error: "string" } },
  forbidden: { status: 403, fields: { error: "string" } },
  ping: {
    status: 200,
    fields: {
      app: "string", version: "string", tokenName: "string", tokenExpiresAt: "string",
      scopes: "array", "scopes[]": "string",
    },
  },
};
