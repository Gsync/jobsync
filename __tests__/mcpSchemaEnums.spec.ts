import { McpAddJobInputShape } from "@/models/mcp.schema";
import { JOB_STATUS_VALUES } from "@/lib/constants";

describe("McpAddJobInputShape.status", () => {
  it("exposes the valid status values as a Zod enum", () => {
    const def: any = (McpAddJobInputShape.status as any)._def;
    // Unwrap ZodOptional -> ZodPipe (the lowercase preprocess) -> ZodEnum.
    const pipeOut = def.innerType?._def?.out;
    const inner = pipeOut ?? def.innerType ?? def;
    const values = inner._def.values ?? Object.values(inner._def.entries ?? {});
    expect([...values].sort()).toEqual([...JOB_STATUS_VALUES].sort());
  });

  it("accepts a valid status and rejects an invalid one", () => {
    expect(McpAddJobInputShape.status.safeParse("applied").success).toBe(true);
    expect(McpAddJobInputShape.status.safeParse("interested").success).toBe(
      false,
    );
  });

  it("accepts a capitalized status and normalizes it to lowercase", () => {
    const result = McpAddJobInputShape.status.safeParse("Applied");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("applied");
  });

  it("includes every value in the human-readable description", () => {
    for (const v of JOB_STATUS_VALUES) {
      expect((McpAddJobInputShape.status as any).description).toContain(v);
    }
  });
});
