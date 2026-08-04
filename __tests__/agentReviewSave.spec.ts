import { detectReviewSave } from "@/lib/agent/review";

const REVIEW = "SCORES: overall=78 impact=72 clarity=81 ats=69\n\n## Summary\n\nSolid.";
const REVIEW_2 = "SCORES: overall=61 impact=55 clarity=64 ats=70\n\n## Summary\n\nHarsher.";

const text = (id: string, role: string, body: string) => ({
  id,
  role,
  parts: [{ type: "text", text: body }],
}) as any;

const readResult = (id: string, resumeId: string, title: string, status = "ok") =>
  ({
    id,
    role: "assistant",
    parts: [
      {
        type: "tool-get_resume",
        toolCallId: `t-${id}`,
        state: "output-available",
        input: {},
        output:
          status === "ok"
            ? { status: "ok", resumeId, title, resumeText: "TXT", chars: 3, truncated: false, source: "default" }
            : { status },
      },
    ],
  }) as any;

// The shape the route actually produces: one assistant message carrying the
// tool result AND the review, because both are steps of one streamText call.
const readAndReview = (id: string, resumeId: string, title: string, body: string) =>
  ({
    id,
    role: "assistant",
    parts: [
      {
        type: "tool-get_resume",
        toolCallId: `t-${id}`,
        state: "output-available",
        input: {},
        output: { status: "ok", resumeId, title, resumeText: "TXT", chars: 3, truncated: false, source: "default" },
      },
      { type: "text", text: body },
    ],
  }) as any;

describe("detectReviewSave", () => {
  // The normal case. A backwards-only scan misses this entirely, because the
  // read it needs is inside the very message it is being asked about.
  it("saves a review whose get_resume result is in the same message", () => {
    const finished = readAndReview("a1", "r1", "Senior Engineer Resume", REVIEW);
    expect(detectReviewSave([text("u1", "user", "Review my resume"), finished], finished)).toEqual({
      resumeId: "r1",
      title: "Senior Engineer Resume",
      scores: { overall: 78, impact: 72, clarity: 81, atsCompatibility: 69 },
      body: expect.stringContaining("## Summary"),
    });
  });

  // The same-message shape must not reopen the window either: the follow-up
  // walks back, hits that message, and has to see its scores before its read.
  it("does not save a follow-up after a same-message review", () => {
    const finished = text("a2", "assistant", REVIEW_2);
    const messages = [
      readAndReview("a1", "r1", "Senior Engineer Resume", REVIEW),
      text("u2", "user", "be harsher"),
      finished,
    ];
    expect(detectReviewSave(messages, finished)).toBeNull();
  });

  it("saves the first review after a get_resume result", () => {
    const finished = text("a2", "assistant", REVIEW);
    const messages = [
      text("u1", "user", "Review my resume"),
      readResult("a1", "r1", "Senior Engineer Resume"),
      finished,
    ];
    expect(detectReviewSave(messages, finished)).toEqual({
      resumeId: "r1",
      title: "Senior Engineer Resume",
      scores: { overall: 78, impact: 72, clarity: 81, atsCompatibility: 69 },
      body: expect.stringContaining("## Summary"),
    });
  });

  it("does not save a message with no scores line", () => {
    const finished = text("a2", "assistant", "The tables are hurting your ATS score.");
    const messages = [readResult("a1", "r1", "Resume"), finished];
    expect(detectReviewSave(messages, finished)).toBeNull();
  });

  it("does not save when no resume was read", () => {
    const finished = text("a1", "assistant", REVIEW);
    expect(detectReviewSave([finished], finished)).toBeNull();
  });

  it("does not save when the read failed", () => {
    const finished = text("a2", "assistant", REVIEW);
    const messages = [readResult("a1", "", "", "no_resumes"), finished];
    expect(detectReviewSave(messages, finished)).toBeNull();
  });

  // The guard the user chose: a chatty follow-up that restates the scores
  // must not replace the full saved review.
  it("does not save a second scoring message after the same read", () => {
    const finished = text("a3", "assistant", REVIEW_2);
    const messages = [
      readResult("a1", "r1", "Resume"),
      text("a2", "assistant", REVIEW),
      text("u2", "user", "be harsher"),
      finished,
    ];
    expect(detectReviewSave(messages, finished)).toBeNull();
  });

  // A deliberate redo re-reads the resume, which opens a fresh window.
  it("saves again after a second get_resume result", () => {
    const finished = text("a4", "assistant", REVIEW_2);
    const messages = [
      readResult("a1", "r1", "Resume"),
      text("a2", "assistant", REVIEW),
      text("u2", "user", "redo it, be harsher"),
      readResult("a3", "r1", "Resume"),
      finished,
    ];
    expect(detectReviewSave(messages, finished)?.scores.overall).toBe(61);
  });

  it("attributes each review to the resume it actually read", () => {
    const finished = text("a4", "assistant", REVIEW_2);
    const messages = [
      readResult("a1", "r1", "Engineer Resume"),
      text("a2", "assistant", REVIEW),
      readResult("a3", "r2", "PM Resume"),
      finished,
    ];
    expect(detectReviewSave(messages, finished)?.resumeId).toBe("r2");
  });

  it("ignores messages after the finished one", () => {
    const finished = text("a2", "assistant", REVIEW);
    const messages = [readResult("a1", "r1", "Resume"), finished, text("a3", "assistant", REVIEW_2)];
    expect(detectReviewSave(messages, finished)?.scores.overall).toBe(78);
  });
});
