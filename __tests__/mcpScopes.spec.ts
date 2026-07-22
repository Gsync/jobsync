import {
  DEFAULT_MCP_TOKEN_SCOPES,
  hasMcpScope,
  MCP_SCOPE,
} from "@/lib/mcp/scopes";

describe("MCP scopes", () => {
  it("keeps resume data out of default write tokens", () => {
    expect(DEFAULT_MCP_TOKEN_SCOPES).toEqual([
      "jobs:create",
      "matches:write",
      "questions:write",
    ]);
    expect(DEFAULT_MCP_TOKEN_SCOPES).not.toContain(MCP_SCOPE.RESUMES_READ);
    expect(DEFAULT_MCP_TOKEN_SCOPES).not.toContain(
      MCP_SCOPE.RESUME_REVIEWS_WRITE,
    );
  });

  it("separates job creation from match persistence", () => {
    expect(hasMcpScope(["jobs:create"], MCP_SCOPE.JOBS_CREATE)).toBe(true);
    expect(hasMcpScope(["jobs:create"], MCP_SCOPE.MATCHES_WRITE)).toBe(false);
    expect(hasMcpScope(["matches:write"], MCP_SCOPE.MATCHES_WRITE)).toBe(true);
  });
});
