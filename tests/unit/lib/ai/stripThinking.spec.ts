import { describe, it, expect } from "vitest";
import { stripThinking } from "@/lib/ai/stripThinking";

describe("stripThinking", () => {
  it("removes a complete <think> block", () => {
    expect(stripThinking("a<think>reasoning</think>b")).toBe("ab");
  });

  it("removes multiple blocks case-insensitively", () => {
    expect(stripThinking("<THINK>1</THINK>keep<think>2</think>")).toBe("keep");
  });

  it("truncates an unterminated trailing block so it never flashes", () => {
    expect(stripThinking("visible<think>still thinking")).toBe("visible");
  });

  it("leaves text without think tags unchanged", () => {
    expect(stripThinking("## Summary\nplain markdown")).toBe(
      "## Summary\nplain markdown",
    );
  });
});
