import { readFileSync } from "node:fs";
import path from "node:path";

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

const rpc = (body: object) =>
  new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", ...body }),
  });

async function listTools(): Promise<unknown[]> {
  await POST(
    rpc({
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "parity-spec", version: "1.0.0" },
      },
    }),
  );
  const res = await POST(rpc({ id: 2, method: "tools/list", params: {} }));
  const json = await res.json();
  return json.result.tools;
}

describe("MCP tools/list parity", () => {
  it("lists the nine tools with unchanged names, descriptions and input schemas", async () => {
    const tools = await listTools();
    const expected = JSON.parse(readFileSync(FIXTURE, "utf8"));
    expect(tools).toHaveLength(9);
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
