import { z } from "zod";
import {
  AgentAddJobSchema,
  AgentAddJobParseSchema,
  AgentChatRequestSchema,
  AgentCoverLetterSchema,
} from "@/models/agent.schema";
import {
  AGENT_CHAT_TERMINAL_TOOLS,
  AGENT_NESTED_TOOLS,
  isNestedTool,
} from "@/models/agent.model";
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

  // Optional in the schema but asked for unconditionally in the text: an
  // omission is then caught by execute, which returns a targeted recovery
  // and a clean card. Making it required moves the same failure into the
  // SDK, where the model gets an opaque error and the user gets "That could
  // not be completed."
  it("keeps jobDescription optional while telling the model to always send it", () => {
    expect(AgentAddJobSchema.safeParse({ company: "Acme", jobTitle: "Eng" }).success).toBe(true);
    expect(AgentAddJobSchema.shape.jobDescription.description).toMatch(/always include this field/i);
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

describe("AgentCoverLetterSchema", () => {
  // The letter is written for the job the user is looking at. Any job-shaped
  // input is an IDOR surface the model could be talked into filling.
  it("exposes exactly one optional field and no job identifier", () => {
    expect(Object.keys(AgentCoverLetterSchema.shape)).toEqual(["resumeTitle"]);
    expect(AgentCoverLetterSchema.safeParse({}).success).toBe(true);
  });

  it("tells the model to omit the title unless the user named one", () => {
    expect(AgentCoverLetterSchema.shape.resumeTitle.description).toMatch(/omit/i);
  });
});

describe("nested tool registry", () => {
  it("names every tool that runs its own generation", () => {
    expect([...AGENT_NESTED_TOOLS]).toEqual([
      "review_resume",
      "match_job",
      "generate_cover_letter",
    ]);
    expect(isNestedTool("generate_cover_letter")).toBe(true);
    expect(isNestedTool("add_job")).toBe(false);
  });

  // A tool that runs its own generation MUST end the turn, or one turn can
  // chain two of them past the turn deadline and discard both.
  it("makes every nested tool terminal", () => {
    for (const name of AGENT_NESTED_TOOLS) {
      expect([...AGENT_CHAT_TERMINAL_TOOLS]).toContain(name);
    }
  });
});
