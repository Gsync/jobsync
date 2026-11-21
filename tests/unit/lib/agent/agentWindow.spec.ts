import type { UIMessage } from "ai";
import { windowStart } from "@/lib/agent/memory/window";
import { APP_CONSTANTS } from "@/lib/constants";

function conversation(length: number, tokens = 100): UIMessage[] {
  const overhead = JSON.stringify([{ type: "text", text: "" }]).length;
  const text = "x".repeat(tokens * APP_CONSTANTS.AGENT_CHAT_CHARS_PER_TOKEN - overhead);
  return Array.from({ length }, (_, index) => ({
    id: String(index),
    role: index % 2 === 0 ? "user" : "assistant",
    parts: [{ type: "text", text }],
  }));
}

function starts(messages: UIMessage[], budget: number) {
  return messages.map((_, end) => windowStart(messages.slice(0, end + 1), budget));
}

describe("windowStart", () => {
  it("jumps to the earliest eligible user and holds the prefix between token overflows", () => {
    const history = conversation(19);
    const indices = starts(history, 1000);
    expect(indices).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 6, 6, 6, 6, 6, 12, 12, 12,
    ]);
    expect(starts(history, 1000)).toEqual(indices);
    expect(new Set(indices.slice(10)).size - 1).toBeLessThanOrEqual(
      Math.ceil(800 / (0.4 * 1000 - 100)),
    );
  });

  it("jumps on count overflow even when all tokens fit", () => {
    const indices = starts(conversation(41), 9000);
    expect(indices.slice(0, 20)).toEqual(Array(20).fill(0));
    expect(indices.slice(20, 30)).toEqual(Array(10).fill(10));
    expect(indices.slice(30, 40)).toEqual(Array(10).fill(20));
    expect(indices[40]).toBe(30);
    expect(new Set(indices.slice(20)).size - 1).toBeLessThanOrEqual(
      Math.ceil(20 / (0.4 * APP_CONSTANTS.AGENT_CHAT_HISTORY_MESSAGES - 1)),
    );
  });

  it("keeps the latest fitting user when no user reaches the low-water marks", () => {
    const history = [...conversation(4), ...conversation(2, 700).slice(1)];
    expect(windowStart(history, 1000)).toBe(2);
  });

  it("keeps the newest assistant when no user fits the hard budget", () => {
    const history = [...conversation(4), ...conversation(2, 700).slice(1)];
    expect(windowStart(history, 500)).toBe(4);
    expect(windowStart([], 500)).toBe(0);
  });

  it("keeps a large answer with its question across the follow-up turn", () => {
    const sized = (id: string, role: "user" | "assistant", chars: number): UIMessage =>
      ({ id, role, parts: [{ type: "text", text: "x".repeat(chars) }] });
    const history = [
      sized("u1", "user", 8000), sized("a1", "assistant", 8000),
      sized("u2", "user", 100), sized("a2", "assistant", 24000), sized("u3", "user", 100),
    ];
    const budget = APP_CONSTANTS.AGENT_CHAT_HISTORY_TOKEN_BUDGET;
    expect(history[windowStart(history, budget)].id).toBe("u2");
    const followUp = [...history, sized("a3", "assistant", 100), sized("u4", "user", 100)];
    expect(followUp[windowStart(followUp, budget)].id).toBe("u2");
  });
});
