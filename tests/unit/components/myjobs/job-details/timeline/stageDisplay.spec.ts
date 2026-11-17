import {
  formatStageDate,
  formatStageDateTime,
  stageInitials,
  isInterviewStage,
  terminalStagesFor,
  askedTally,
} from "@/components/myjobs/job-details/timeline/stageDisplay";

const stage = (over: any = {}) => ({
  id: "s1",
  occurredAt: null,
  durationMins: null,
  prepQuestions: [],
  StageType: { id: "t1", value: "offer", sortOrder: 7, Status: { value: "offer" } },
  ...over,
});

describe("formatStageDate", () => {
  it("renders an em dash for an undated stage rather than a blank", () => {
    expect(formatStageDate(null)).toBe("—");
  });

  it("renders a short month and day", () => {
    expect(formatStageDate(new Date(2026, 8, 24, 10, 0))).toBe("Sep 24");
  });
});

describe("formatStageDateTime", () => {
  it("says so plainly when there is no date", () => {
    expect(formatStageDateTime(null, null)).toBe("No date set");
  });

  it("includes the duration only when there is one", () => {
    const past = new Date(2020, 8, 24, 10, 0);
    expect(formatStageDateTime(past, 90)).toBe("Sep 24, 2020 · 10:00 AM · 90 min");
    expect(formatStageDateTime(past, null)).toBe("Sep 24, 2020 · 10:00 AM");
  });

  // The artboard's wording, kept only where it is true. A past stage that
  // reads "Scheduled for" a date already gone is simply wrong, and the
  // prefix doubles as the at-a-glance upcoming/done signal.
  it('prefixes "Scheduled for" only when the stage is still ahead', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    expect(formatStageDateTime(future, 90)).toMatch(/^Scheduled for /);

    const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    expect(formatStageDateTime(past, 90)).not.toMatch(/^Scheduled for /);
  });
});

describe("stageInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(stageInitials("Priya Nair")).toBe("PN");
    expect(stageInitials("Cher")).toBe("C");
    expect(stageInitials("  ")).toBe("?");
  });
});

describe("isInterviewStage", () => {
  it("discriminates on the parent status, never on the stage's timing", () => {
    expect(isInterviewStage(stage({ StageType: { Status: { value: "interview" } } }) as any)).toBe(true);
    expect(isInterviewStage(stage() as any)).toBe(false);
  });
});

describe("terminalStagesFor", () => {
  const types = [
    { id: "t-off", value: "offer", sortOrder: 7, statusId: "s-off", label: "Offer", Status: { value: "offer" } },
    { id: "t-rej", value: "rejected", sortOrder: 10, statusId: "s-rej", label: "Rejected", Status: { value: "rejected" } },
    { id: "t-int", value: "interview", sortOrder: 3, statusId: "s-int", label: "Interview", Status: { value: "interview" } },
  ] as any;

  // D6: Offer alone. Rejected and Withdrawn are alternative endings, not
  // next steps, and the mockup shows a single greyed tail step.
  it("returns only the unreached Offer step", () => {
    const result = terminalStagesFor([], types);
    expect(result.map((t: any) => t.value)).toEqual(["offer"]);
  });

  it("drops the terminal type the job has already reached", () => {
    const result = terminalStagesFor(
      [stage({ stageTypeId: "t-off" })] as any,
      types,
    );
    expect(result).toEqual([]);
  });

  // A custom "Verbal Offer" type under the same parent status must not put a
  // second greyed Offer step on the rail.
  it("returns at most one type per parent status", () => {
    const withCustom = [
      ...types,
      { id: "t-verbal", value: "verbal offer", sortOrder: 14, statusId: "s-off", label: "Verbal Offer", Status: { value: "offer" } },
    ] as any;

    const result = terminalStagesFor([], withCustom);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe("offer");
  });
});

describe("askedTally", () => {
  it("counts asked out of total", () => {
    expect(
      askedTally(
        stage({
          prepQuestions: [{ asked: true }, { asked: true }, { asked: false }, { asked: false }],
        }) as any,
      ),
    ).toEqual({ asked: 2, total: 4 });
  });
});
