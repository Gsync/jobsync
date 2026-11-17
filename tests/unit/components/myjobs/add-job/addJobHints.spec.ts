import {
  dueDateHint,
  missingRequiredFields,
  splitStatuses,
} from "@/components/myjobs/add-job/addJobHints";
import { JOB_STATUSES } from "@/lib/constants";

describe("splitStatuses", () => {
  it("orders primary by PRIMARY_STATUS_VALUES whatever the input order", () => {
    const shuffled = [...JOB_STATUSES]
      .reverse()
      .map((s, i) => ({ id: `s${i}`, ...s }));
    const { primary, more } = splitStatuses(shuffled);
    expect(primary.map((s) => s.value)).toEqual([
      "new",
      "draft",
      "applied",
      "interview",
      "offer",
    ]);
    expect(more.map((s) => s.value)).toEqual([
      "withdrawn",
      "archived",
      "expired",
      "rejected",
      "offer-declined",
      "offer-accepted",
    ]);
  });

  it("puts an unknown value in more", () => {
    expect(
      splitStatuses([{ id: "x", label: "Ghosted", value: "ghosted" }]).more,
    ).toHaveLength(1);
  });
});

describe("dueDateHint", () => {
  const today = new Date(2026, 9, 25, 15, 0);
  it.each([
    [new Date(2026, 9, 25, 1, 0), "Due today"],
    [new Date(2026, 9, 26), "In 1 day"],
    [new Date(2026, 9, 28), "In 3 days"],
    [new Date(2026, 9, 24), "1 day ago"],
    [new Date(2026, 9, 20), "5 days ago"],
  ])("%s → %s", (due, hint) => expect(dueDateHint(due, today)).toBe(hint));

  it("is empty without a date", () =>
    expect(dueDateHint(undefined, today)).toBe(""));
});

describe("missingRequiredFields", () => {
  it("lists empty fields in form order", () => {
    expect(
      missingRequiredFields({ company: "c1", title: "", source: undefined }),
    ).toEqual(["title", "location", "source"]);
  });

  it("is empty when all are set", () => {
    expect(
      missingRequiredFields({
        title: "a",
        company: "b",
        location: "c",
        source: "d",
      }),
    ).toEqual([]);
  });
});
