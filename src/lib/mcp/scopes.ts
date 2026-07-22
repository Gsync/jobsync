export const MCP_SCOPE = {
  JOBS_CREATE: "jobs:create",
  MATCHES_WRITE: "matches:write",
  QUESTIONS_WRITE: "questions:write",
  RESUMES_READ: "resumes:read",
  RESUME_REVIEWS_WRITE: "resume-reviews:write",
} as const;

export const DEFAULT_MCP_TOKEN_SCOPES = [
  MCP_SCOPE.JOBS_CREATE,
  MCP_SCOPE.MATCHES_WRITE,
  MCP_SCOPE.QUESTIONS_WRITE,
] as const;

export function hasMcpScope(
  scopes: readonly string[],
  required: string,
): boolean {
  return scopes.includes(required);
}
