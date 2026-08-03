import {
  AGENT_CHAT_PROMPT_SECTIONS,
  AGENT_CHAT_SYSTEM_PROMPT,
  AGENT_TOOL_DESCRIPTIONS,
  buildPasteContextMessage,
} from "@/lib/agent/prompt";
import {
  RESUME_REVIEW_SYSTEM_PROMPT,
  RESUME_REVIEW_OUTPUT_FORMAT,
} from "@/lib/ai/prompts/resume-review";

const SCORES_LINE = "SCORES: overall=<0-100> impact=<0-100> clarity=<0-100> ats=<0-100>";

describe("agent chat system prompt", () => {
  it("is composed from named sections, all of which appear in the prompt", () => {
    const keys = Object.keys(AGENT_CHAT_PROMPT_SECTIONS);
    expect(keys).toEqual(
      expect.arrayContaining(["role", "capabilities", "limitations", "paste", "safety"]),
    );
    for (const key of keys) {
      expect(AGENT_CHAT_SYSTEM_PROMPT).toContain(
        AGENT_CHAT_PROMPT_SECTIONS[key as keyof typeof AGENT_CHAT_PROMPT_SECTIONS],
      );
    }
  });

  it("keeps what the agent can do separate from what it cannot read", () => {
    expect(AGENT_CHAT_PROMPT_SECTIONS.capabilities).toContain("add_job");
    expect(AGENT_CHAT_PROMPT_SECTIONS.limitations).toMatch(/cannot read/i);
    expect(AGENT_CHAT_PROMPT_SECTIONS.capabilities).not.toMatch(/cannot read/i);
  });

  // Measured, not assumed: without this, qwen3.5:9b extracted correctly and
  // then asked for confirmation in prose on 5 of 7 eval rows instead of
  // calling the tool, re-implementing the approval card in chat text.
  it("tells the model to call the tool instead of confirming in chat", () => {
    expect(AGENT_CHAT_PROMPT_SECTIONS.capabilities).toMatch(/never ask.*confirm in the chat/i);
    expect(AGENT_CHAT_PROMPT_SECTIONS.capabilities).toMatch(/never ask the user for optional fields/i);
  });

  it("tells the model not to echo a pasted description back", () => {
    expect(AGENT_CHAT_PROMPT_SECTIONS.paste).toMatch(/do not.*(repeat|echo|copy)/i);
  });

  it("names the approval verbs the UI actually uses", () => {
    expect(AGENT_CHAT_SYSTEM_PROMPT).toContain("Confirm");
    expect(AGENT_CHAT_SYSTEM_PROMPT).toContain("Cancel");
  });

  it("treats delimited pasted content as data, never as instructions", () => {
    expect(AGENT_CHAT_PROMPT_SECTIONS.safety).toMatch(/never.*instructions/i);
    expect(buildPasteContextMessage("<<<X>>>body<<<END X>>>")).toContain("<<<X>>>body<<<END X>>>");
    expect(buildPasteContextMessage("BLOCK")).toMatch(/data/i);
  });

  it("describes add_job without mentioning tools the chat does not expose", () => {
    expect(AGENT_TOOL_DESCRIPTIONS.add_job).toBeTruthy();
    expect(AGENT_TOOL_DESCRIPTIONS.add_job).not.toMatch(/upsert|allowDuplicate|update_job/);
  });

  // One source of truth: the MCP path and the review route already share
  // this text, and a second copy in the chat would drift silently.
  it("reuses the review output format rather than restating it", () => {
    expect(AGENT_CHAT_SYSTEM_PROMPT).toContain(RESUME_REVIEW_OUTPUT_FORMAT);
    expect(RESUME_REVIEW_SYSTEM_PROMPT).toContain(RESUME_REVIEW_OUTPUT_FORMAT);
  });

  it("keeps the exact SCORES line the shared parser matches", () => {
    expect(RESUME_REVIEW_OUTPUT_FORMAT).toContain(SCORES_LINE);
    expect(RESUME_REVIEW_OUTPUT_FORMAT).toContain("## Grammar & Spelling");
  });

  it("no longer claims resumes are unreadable", () => {
    expect(AGENT_CHAT_SYSTEM_PROMPT).toContain("get_resume");
    expect(AGENT_CHAT_SYSTEM_PROMPT).not.toContain(
      "saved jobs, resumes, tasks",
    );
  });

  it("describes both tools", () => {
    expect(Object.keys(AGENT_TOOL_DESCRIPTIONS)).toEqual(["add_job", "get_resume"]);
  });
});
