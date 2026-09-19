import { getMcpScopeError } from "@/lib/mcp/scope";

describe("getMcpScopeError", () => {
  it("allows a granted scope", () => {
    expect(getMcpScopeError(["tasks:read"], "tasks:read")).toBeNull();
  });

  it("returns the required scope when access is missing", () => {
    expect(getMcpScopeError(["jobs:write"], "tasks:read")).toEqual({
      content: [
        { type: "text", text: "Insufficient scope. Required: tasks:read" },
      ],
    });
  });
});
