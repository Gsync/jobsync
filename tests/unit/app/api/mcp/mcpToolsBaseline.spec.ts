import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/mcp/route";
import { MCP_TOOLS_BASELINE } from "./fixtures/mcpToolsBaseline";
import { listTools } from "./helpers/listTools";
import { baselineViolations, summarizeTool, type ToolContract } from "./helpers/toolContract";

vi.mock("@/lib/mcp/auth", () => ({
  resolveMcpToken: vi.fn(async () => ({
    ok: true, userId: "user-1", tokenName: "test", scopes: ["jobs:write", "questions:write"],
  })),
}));

const empty: ToolContract = { args: {}, required: [], enums: {} };
const status = { ...empty, args: { status: "string" } };
const jobs = {
  ...empty, args: { jobs: "array", "jobs[]": "object", "jobs[].company": "string" },
};

describe("MCP compatibility checks", () => {
  it("identifies a removed tool", () => {
    expect(baselineViolations({}, { save: empty })).toEqual(["save: missing tool"]);
  });

  it.each<[string, ToolContract, ToolContract, string]>([
    ["removed argument", status, empty, "save.status: missing argument"],
    ["removed nested argument", jobs, { ...empty, args: { jobs: "array", "jobs[]": "object" } },
      "save.jobs[].company: missing argument"],
    ["retyped argument", status, { ...empty, args: { status: "number" } },
      "save.status: expected string, got number"],
    ["retyped array item", { ...empty, args: { "jobs[]": "object" } },
      { ...empty, args: { "jobs[]": "string" } }, "save.jobs[]: expected object, got string"],
    ["newly required top-level argument", empty, { ...status, required: ["status"] },
      "save.status: newly required"],
    ["newly required nested argument", jobs, { ...jobs, required: ["jobs[].company"] },
      "save.jobs[].company: newly required"],
    ["removed enum value", { ...status, enums: { status: ["open", "closed"] } },
      { ...status, enums: { status: ["closed"] } }, "save.status: missing enum value open"],
    ["new enum restriction", status, { ...status, enums: { status: ["open"] } },
      "save.status: newly constrained to an enum"],
  ])("identifies a %s", (_name, before, after, message) => {
    expect(baselineViolations({ save: after }, { save: before })).toEqual([message]);
  });

  it("allows a new tool", () => {
    expect(baselineViolations({ save: status, find: empty }, { save: status })).toEqual([]);
  });

  it.each<[string, ToolContract, ToolContract]>([
    ["an optional argument", empty, status],
    ["a new enum value", { ...status, enums: { status: ["open"] } },
      { ...status, enums: { status: ["open", "closed"] } }],
    ["lifting an enum restriction", { ...status, enums: { status: ["open"] } }, status],
    ["a required child of a new optional object", empty, {
      ...empty, args: { filters: "object", "filters.status": "string" }, required: ["filters.status"],
    }],
  ])("allows %s", (_name, before, after) => {
    expect(baselineViolations({ save: after }, { save: before })).toEqual([]);
  });

  it("summarizes nested item types, requirements and enum values", () => {
    const schema = {
      type: "object", required: ["jobs"],
      properties: { jobs: { type: "array", items: {
        type: "object", required: ["status"], properties: {
          status: { type: "string", enum: ["open", "closed"] },
          title: { type: ["string", "null"] },
        },
      } } },
    };
    expect(summarizeTool(schema)).toEqual({
      args: { jobs: "array", "jobs[]": "object", "jobs[].status": "string", "jobs[].title": "null|string" },
      required: ["jobs", "jobs[].status"], enums: { "jobs[].status": ["open", "closed"] },
    });
  });
});

it("keeps the tools/list contract for existing MCP clients", async () => {
  const tools = await listTools(POST);
  const actual = Object.fromEntries(tools.map(tool => [tool.name, summarizeTool(tool.inputSchema)]));
  expect(baselineViolations(actual, MCP_TOOLS_BASELINE),
    "MCP tools/list dropped something clients rely on. Fix the tool, not the baseline (root CLAUDE.md, Public API v1 covers the same promise)",
  ).toEqual([]);
});
