import {
  outcomeLabel,
  outcomeTone,
  formatIconKind,
  formatText,
  durationLabel,
  whenParts,
  interviewerSummary,
  prepSummary,
} from "@/components/interviews/interviewDisplay";

const now = new Date("2026-09-21T12:00:00Z");

describe("outcomeLabel", () => {
  it("prefers the stored outcome over anything derived", () => {
    expect(outcomeLabel(new Date("2026-09-30T10:00:00Z"), "failed", now)).toBe(
      "Failed",
    );
  });

  it("derives Scheduled for a round still ahead", () => {
    expect(outcomeLabel(new Date("2026-09-23T10:00:00Z"), null, now)).toBe(
      "Scheduled",
    );
  });

  it("derives Awaiting outcome for a round already past", () => {
    expect(outcomeLabel(new Date("2026-09-12T10:00:00Z"), null, now)).toBe(
      "Awaiting outcome",
    );
  });

  it("derives Not scheduled for a round with no date", () => {
    expect(outcomeLabel(null, null, now)).toBe("Not scheduled");
  });

  it("ignores an outcome value that is not in the fixed set", () => {
    expect(outcomeLabel(null, "ghosted", now)).toBe("Not scheduled");
  });
});

describe("outcomeTone", () => {
  it("marks a bad ending destructive and a good one default", () => {
    expect(outcomeTone("Failed")).toBe("destructive");
    expect(outcomeTone("No-show")).toBe("destructive");
    expect(outcomeTone("Passed")).toBe("default");
    expect(outcomeTone("Scheduled")).toBe("outline");
    expect(outcomeTone("Not scheduled")).toBe("secondary");
  });
});

describe("formatIconKind", () => {
  it("recognises the common video and phone wordings", () => {
    expect(formatIconKind("Video")).toBe("video");
    expect(formatIconKind("zoom call")).toBe("video");
    expect(formatIconKind("MS Teams")).toBe("video");
    expect(formatIconKind("Phone screen")).toBe("phone");
  });

  it("falls back to a pin for anything unfamiliar or empty", () => {
    expect(formatIconKind("Onsite")).toBe("location");
    expect(formatIconKind(null)).toBe("location");
  });
});

describe("formatText", () => {
  it("prefers the location, then the format, then a placeholder", () => {
    expect(formatText("Video", "Google Meet")).toBe("Google Meet");
    expect(formatText("Recruiter call", "")).toBe("Recruiter call");
    expect(formatText(null, null)).toBe("Not set");
  });
});

describe("durationLabel", () => {
  it("renders whole hours as hours and everything else as minutes", () => {
    expect(durationLabel(180)).toBe("3h");
    expect(durationLabel(90)).toBe("90m");
    expect(durationLabel(30)).toBe("30m");
    expect(durationLabel(null)).toBeNull();
  });
});

describe("whenParts", () => {
  it("splits a date into a day line and a time line", () => {
    expect(whenParts(new Date("2026-09-23T14:30:00"))).toEqual({
      day: "Wed 23 Sep",
      time: "2:30 PM",
    });
  });

  it("says No date rather than inventing one", () => {
    expect(whenParts(null)).toEqual({ day: "No date", time: null });
  });
});

describe("interviewerSummary", () => {
  const person = (name: string) => ({ Contact: { name } });

  it("abbreviates up to two names", () => {
    expect(
      interviewerSummary([person("Ayesha Rahman"), person("Jordan Pike")]),
    ).toBe("A. Rahman, J. Pike");
  });

  it("counts three or more", () => {
    expect(
      interviewerSummary([person("A B"), person("C D"), person("E F")]),
    ).toBe("3 interviewers");
  });

  it("says when nobody is linked", () => {
    expect(interviewerSummary([])).toBe("None linked");
  });
});

describe("prepSummary", () => {
  it("shows asked over total once anything has been asked", () => {
    expect(prepSummary([{ asked: true }, { asked: false }])).toBe("1 / 2");
  });

  it("shows the plain total when nothing has been asked", () => {
    expect(prepSummary([{ asked: false }, { asked: false }])).toBe("2");
    expect(prepSummary([])).toBe("0");
  });
});
