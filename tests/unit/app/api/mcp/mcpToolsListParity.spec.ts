import { readFileSync } from "node:fs";
import path from "node:path";
import { listTools, rpc } from "./helpers/listTools";

vi.mock("@/lib/mcp/auth", () => ({
  resolveMcpToken: vi.fn(async () => ({
    ok: true,
    userId: "user-1",
    tokenName: "test",
    scopes: ["jobs:write", "questions:write"],
  })),
}));

vi.mock("@/lib/mcp/tools/findJob", () => ({
  handleFindJob: vi.fn(async () => ({ content: [{ type: "text", text: "found" }] })),
}));

import { POST } from "@/app/api/mcp/route";
import { handleFindJob } from "@/lib/mcp/tools/findJob";

// What MCP clients see. Captured from the route before the server.tool →
// registerTool migration; it must not change without a deliberate decision.
const FIXTURE = path.join(__dirname, "fixtures/mcpToolsList.json");

describe("MCP tools/list parity", () => {
  it("lists the eleven tools with unchanged names, descriptions and input schemas", async () => {
    const tools = await listTools(POST);
    const expected = JSON.parse(readFileSync(FIXTURE, "utf8"));
    expect(tools).toHaveLength(11);
    expect(tools).toEqual(expected);
  });

  it("routes a tools/call to its handler with the parsed input and session user", async () => {
    const res = await POST(
      rpc({ id: 3, method: "tools/call", params: { name: "find_job", arguments: { jobUrl: "https://example.com/job/1" } } }),
    );
    const json = await res.json();
    expect(json.result.content[0].text).toBe("found");
    expect(handleFindJob).toHaveBeenCalledWith(expect.objectContaining({ jobUrl: "https://example.com/job/1" }), "user-1");
  });
});
