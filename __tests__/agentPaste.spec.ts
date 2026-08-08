import {
  resolvePastedText,
  stubConsumedPastes,
  hasPendingApproval,
  windowMessages,
} from "@/lib/agent/paste";
import { truncateForModel } from "@/lib/agent/paste.server";
import { AGENT_PASTE_PART_TYPE } from "@/models/agent.model";
import { APP_CONSTANTS } from "@/lib/constants";
import { convertToModelMessages } from "ai";

const pastePart = (id: string, text: string, consumed = false) => ({
  type: AGENT_PASTE_PART_TYPE,
  id,
  data: { id, text, chars: text.length, truncated: false, consumed },
});

const userMsg = (id: string, parts: any[]) => ({
  id,
  role: "user" as const,
  parts,
});
const assistantMsg = (id: string, parts: any[]) => ({
  id,
  role: "assistant" as const,
  parts,
});

const toolPart = (state: string, extra: Record<string, unknown> = {}) => ({
  type: "tool-add_job",
  toolCallId: "call-1",
  state,
  input: { company: "Acme", jobTitle: "Engineer" },
  ...extra,
});

describe("resolvePastedText", () => {
  it("returns the newest unconsumed paste", () => {
    const messages = [
      userMsg("1", [pastePart("p1", "older posting")]),
      userMsg("2", [pastePart("p2", "newer posting")]),
    ] as any;
    expect(resolvePastedText(messages)).toBe("newer posting");
  });

  it("skips a paste that has already been consumed", () => {
    const messages = [
      userMsg("1", [pastePart("p1", "still available")]),
      userMsg("2", [pastePart("p2", "[stub]", true)]),
    ] as any;
    expect(resolvePastedText(messages)).toBe("still available");
  });

  it("returns undefined when nothing was pasted", () => {
    expect(
      resolvePastedText([userMsg("1", [{ type: "text", text: "hi" }])] as any),
    ).toBeUndefined();
  });

  it("ignores a paste the user has moved past", () => {
    const messages = [
      userMsg("1", [pastePart("p1", "abandoned posting")]),
      assistantMsg("2", [{ type: "text", text: "Looks interesting." }]),
      userMsg("3", [{ type: "text", text: "what else should I apply to?" }]),
      assistantMsg("4", [{ type: "text", text: "I cannot read your jobs yet." }]),
      userMsg("5", [{ type: "text", text: "add a job: Eng at Acme, remote" }]),
    ] as any;
    expect(resolvePastedText(messages)).toBeUndefined();
  });

  it("still resolves a paste across one clarifying exchange", () => {
    const messages = [
      userMsg("1", [pastePart("p1", "the posting")]),
      assistantMsg("2", [{ type: "text", text: "Shall I add it?" }]),
      userMsg("3", [{ type: "text", text: "yes" }]),
    ] as any;
    expect(resolvePastedText(messages)).toBe("the posting");
  });
});

describe("truncateForModel", () => {
  it("truncates to the head length", () => {
    const long = "x".repeat(APP_CONSTANTS.AGENT_CHAT_PASTE_HEAD_CHARS + 500);
    const { block } = truncateForModel(long, "NONCE1");
    const body = block.split("\n").slice(1, -1).join("\n");
    expect(body).toHaveLength(APP_CONSTANTS.AGENT_CHAT_PASTE_HEAD_CHARS);
  });

  it("strips the nonce from the text before wrapping, not after", () => {
    const attack = `Real posting NONCE1 more text`;
    const { block } = truncateForModel(attack, "NONCE1");
    const opens = block.split("<<<PASTED_NONCE1>>>").length - 1;
    const closes = block.split("<<<END_PASTED_NONCE1>>>").length - 1;
    expect(opens).toBe(1);
    expect(closes).toBe(1);
    const body = block.split("\n").slice(1, -1).join("\n");
    expect(body).not.toContain("NONCE1");
  });

  it("generates a different nonce on each call by default", () => {
    expect(truncateForModel("a").nonce).not.toBe(truncateForModel("a").nonce);
  });
});

describe("stubConsumedPastes", () => {
  it("replaces the payload once a write has produced output", () => {
    const messages = [
      userMsg("1", [pastePart("p1", "the whole 6kb posting")]),
      assistantMsg("2", [
        toolPart("output-available", {
          output: { created: true, jobId: "job-1", resolutions: [] },
        }),
      ]),
    ] as any;
    const stubbed = stubConsumedPastes(messages);
    const part: any = stubbed[0].parts[0];
    expect(part.data.text).not.toContain("6kb posting");
    expect(part.data.text).toContain("Engineer");
    expect(part.data.text).toContain("Acme");
    expect(part.data.consumed).toBe(true);
  });

  it("leaves an unconsumed paste alone while the approval is still pending", () => {
    const messages = [
      userMsg("1", [pastePart("p1", "the whole 6kb posting")]),
      assistantMsg("2", [
        toolPart("approval-requested", { approval: { id: "a1" } }),
      ]),
    ] as any;
    expect(
      (stubConsumedPastes(messages)[0].parts[0] as any).data.text,
    ).toContain("6kb posting");
  });

  it("leaves the paste alone when the write reported a duplicate", () => {
    const messages = [
      userMsg("1", [pastePart("p1", "the whole 6kb posting")]),
      assistantMsg("2", [
        toolPart("output-available", {
          output: {
            created: false,
            resolutions: [],
            duplicateOf: { id: "j", title: "t", company: "c" },
          },
        }),
      ]),
    ] as any;
    expect(
      (stubConsumedPastes(messages)[0].parts[0] as any).data.text,
    ).toContain("6kb posting");
  });

  // created is add_job's field. Any future tool reusing the name would
  // otherwise stub out a posting the user cannot re-derive.
  it("ignores a created:true result from a tool that is not add_job", () => {
    const messages = [
      userMsg("1", [pastePart("p1", "the whole 6kb posting")]),
      assistantMsg("2", [
        {
          ...toolPart("output-available", {
            output: { created: true, coverLetterId: "cl-1" },
          }),
          type: "tool-write_cover_letter",
        },
      ]),
    ] as any;
    const part: any = stubConsumedPastes(messages)[0].parts[0];
    expect(part.data.text).toContain("6kb posting");
    expect(part.data.consumed).toBe(false);
  });
});

describe("hasPendingApproval", () => {
  it("is true while a tool part is awaiting a response", () => {
    expect(
      hasPendingApproval([
        assistantMsg("1", [
          toolPart("approval-requested", { approval: { id: "a1" } }),
        ]),
      ] as any),
    ).toBe(true);
  });

  it("is false for an ordinary text reply", () => {
    expect(
      hasPendingApproval([
        assistantMsg("1", [{ type: "text", text: "sure" }]),
      ] as any),
    ).toBe(false);
  });

  it("is false once the approval has been responded to", () => {
    expect(
      hasPendingApproval([
        assistantMsg("1", [
          toolPart("approval-responded", {
            approval: { id: "a1", approved: true },
          }),
        ]),
      ] as any),
    ).toBe(false);
  });
});

describe("windowMessages", () => {
  it("sends at most AGENT_CHAT_HISTORY_MESSAGES, keeping the newest", () => {
    const many = Array.from(
      { length: APP_CONSTANTS.AGENT_CHAT_HISTORY_MESSAGES + 10 },
      (_, i) => userMsg(`m${i}`, []),
    );
    const windowed = windowMessages(many as any);
    expect(windowed).toHaveLength(APP_CONSTANTS.AGENT_CHAT_HISTORY_MESSAGES);
    expect(windowed[windowed.length - 1].id).toBe(`m${many.length - 1}`);
  });

  it("cuts on the token budget before the message count when messages are fat", () => {
    // A third of the budget each, so only the newest few fit.
    const fatText = "x".repeat(
      (APP_CONSTANTS.AGENT_CHAT_HISTORY_TOKEN_BUDGET / 3) *
        APP_CONSTANTS.AGENT_CHAT_CHARS_PER_TOKEN,
    );
    const many = Array.from(
      { length: APP_CONSTANTS.AGENT_CHAT_HISTORY_MESSAGES },
      (_, i) => userMsg(`m${i}`, [{ type: "text", text: fatText }]),
    );
    const windowed = windowMessages(many as any);
    expect(windowed.length).toBeLessThan(
      APP_CONSTANTS.AGENT_CHAT_HISTORY_MESSAGES,
    );
    expect(windowed[windowed.length - 1].id).toBe(`m${many.length - 1}`);
  });

  it("keeps the newest message even when it alone exceeds the budget", () => {
    const huge = "x".repeat(
      APP_CONSTANTS.AGENT_CHAT_HISTORY_TOKEN_BUDGET *
        APP_CONSTANTS.AGENT_CHAT_CHARS_PER_TOKEN *
        2,
    );
    const messages = [
      userMsg("1", [{ type: "text", text: "earlier" }]),
      userMsg("2", [{ type: "text", text: huge }]),
    ] as any;
    const windowed = windowMessages(messages);
    expect(windowed).toHaveLength(1);
    expect(windowed[0].id).toBe("2");
  });

  // The payoff over a message count: a paste part is dropped by
  // convertToModelMessages, so charging history for it would evict real
  // context to make room for text the model never sees.
  it("does not charge the budget for a data-paste part", () => {
    const huge = "x".repeat(APP_CONSTANTS.AGENT_CHAT_PASTE_MAX_CHARS);
    const messages = [
      userMsg("1", [{ type: "text", text: "earlier" }]),
      userMsg("2", [{ type: "text", text: "add this" }, pastePart("p1", huge)]),
    ] as any;
    expect(windowMessages(messages)).toHaveLength(2);
  });
});

// Settles spec "to verify" item 1: the head has to be injected explicitly
// precisely because convertToModelMessages drops custom data parts.
describe("convertToModelMessages and data parts", () => {
  it("drops the paste part rather than carrying the full text to the model", async () => {
    const messages = [
      userMsg("1", [
        { type: "text", text: "add this" },
        pastePart("p1", "SECRET_POSTING_BODY"),
      ]),
    ] as any;
    // convertToModelMessages is async (correction #5). Unawaited, this would
    // stringify a Promise ("{}") and pass vacuously — and it is a security
    // assertion, so vacuous-pass is worse than failing.
    const modelMessages = await convertToModelMessages(messages);
    expect(JSON.stringify(modelMessages)).not.toContain("SECRET_POSTING_BODY");
  });
});
