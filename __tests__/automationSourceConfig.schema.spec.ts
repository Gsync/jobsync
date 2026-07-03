import { CreateAutomationSchema } from "@/models/automation.schema";

const base = {
  name: "Test",
  resumeId: "550e8400-e29b-41d4-a716-446655440000",
  matchThreshold: 80,
  scheduleHour: 8,
};

describe("CreateAutomationSchema conditional validation", () => {
  it("jsearch requires keywords + location", () => {
    const result = CreateAutomationSchema.safeParse({
      ...base,
      jobBoard: "jsearch",
    });
    expect(result.success).toBe(false);
  });

  it("jsearch passes with keywords + location", () => {
    const result = CreateAutomationSchema.safeParse({
      ...base,
      jobBoard: "jsearch",
      keywords: "frontend",
      location: "Canada",
    });
    expect(result.success).toBe(true);
  });

  it("greenhouse requires at least one company", () => {
    const result = CreateAutomationSchema.safeParse({
      ...base,
      jobBoard: "greenhouse",
      sourceConfig: { greenhouse: { companies: [] } },
    });
    expect(result.success).toBe(false);
  });

  it("greenhouse passes with one company and no keywords/location", () => {
    const result = CreateAutomationSchema.safeParse({
      ...base,
      jobBoard: "greenhouse",
      sourceConfig: {
        greenhouse: {
          companies: [{ name: "Anthropic", token: "anthropic" }],
          targetTitles: ["Frontend Engineer"],
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("greenhouse accepts topK within 1-50 and a saveUnanalyzed boolean", () => {
    const result = CreateAutomationSchema.safeParse({
      ...base,
      jobBoard: "greenhouse",
      sourceConfig: {
        greenhouse: {
          companies: [{ name: "Anthropic", token: "anthropic" }],
          topK: 25,
          saveUnanalyzed: false,
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("greenhouse rejects topK of 0", () => {
    const result = CreateAutomationSchema.safeParse({
      ...base,
      jobBoard: "greenhouse",
      sourceConfig: {
        greenhouse: {
          companies: [{ name: "Anthropic", token: "anthropic" }],
          topK: 0,
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it("greenhouse rejects topK of 51", () => {
    const result = CreateAutomationSchema.safeParse({
      ...base,
      jobBoard: "greenhouse",
      sourceConfig: {
        greenhouse: {
          companies: [{ name: "Anthropic", token: "anthropic" }],
          topK: 51,
        },
      },
    });
    expect(result.success).toBe(false);
  });
});
