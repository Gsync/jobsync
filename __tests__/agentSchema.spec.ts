import { z } from "zod";
import {
  AgentAddJobSchema,
  AgentAddJobParseSchema,
  AgentChatRequestSchema,
} from "@/models/agent.schema";
import { McpAddJobInputShape } from "@/models/mcp.schema";
import { JOB_STATUS_VALUES } from "@/lib/constants";

describe("AgentAddJobSchema", () => {
  it("drops upsert and allowDuplicate so the model cannot force past dedupe", () => {
    expect("upsert" in AgentAddJobSchema.shape).toBe(false);
    expect("allowDuplicate" in AgentAddJobSchema.shape).toBe(false);
  });

  it("inherits every other field from the MCP shape", () => {
    const inherited = Object.keys(McpAddJobInputShape).filter(
      (k) => k !== "upsert" && k !== "allowDuplicate",
    );
    expect(Object.keys(AgentAddJobSchema.shape).sort()).toEqual(inherited.sort());
  });

  it("inherits the MCP describe() text for a field it does not override", () => {
    expect(AgentAddJobSchema.shape.location.description).toBe(
      McpAddJobInputShape.location.description,
    );
  });

  it("makes jobDescription optional and tells the model to omit it on the paste path", () => {
    expect(AgentAddJobSchema.safeParse({ company: "Acme", jobTitle: "Eng" }).success).toBe(true);
    expect(AgentAddJobSchema.shape.jobDescription.description).toMatch(/omit/i);
    expect(AgentAddJobSchema.shape.jobDescription.description).not.toBe(
      McpAddJobInputShape.jobDescription.description,
    );
  });

  it("still emits status as an enum in the model-facing JSON schema", () => {
    const json = z.toJSONSchema(AgentAddJobSchema, { io: "input" }) as any;
    const statusJson = JSON.stringify(json.properties.status);
    for (const value of JOB_STATUS_VALUES) {
      expect(statusJson).toContain(`"${value}"`);
    }
  });

  it("defers the date transforms — the model-facing schema keeps strings", () => {
    const parsed = AgentAddJobSchema.parse({
      company: "Acme",
      jobTitle: "Eng",
      dueDate: "2030-01-01T00:00:00Z",
    });
    expect(typeof parsed.dueDate).toBe("string");
  });

  it("converts the dates in the parse schema used inside execute", () => {
    const parsed = AgentAddJobParseSchema.parse({
      company: "Acme",
      jobTitle: "Eng",
      dueDate: "2030-01-01T00:00:00Z",
      appliedDate: "2029-01-01T00:00:00Z",
    });
    expect(parsed.dueDate).toBeInstanceOf(Date);
    expect(parsed.appliedDate).toBeInstanceOf(Date);
  });

  it("strips a model-supplied userId rather than carrying it through", () => {
    const parsed: any = AgentAddJobParseSchema.parse({
      company: "Acme",
      jobTitle: "Eng",
      userId: "attacker-user",
    });
    expect(parsed.userId).toBeUndefined();
  });
});

describe("AgentChatRequestSchema", () => {
  it("accepts messages with an optional page context", () => {
    expect(
      AgentChatRequestSchema.safeParse({
        messages: [{ id: "1", role: "user", parts: [] }],
        pageContext: { route: "/dashboard/myjobs" },
      }).success,
    ).toBe(true);
  });

  it("rejects a body with no messages array", () => {
    expect(AgentChatRequestSchema.safeParse({}).success).toBe(false);
  });
});
