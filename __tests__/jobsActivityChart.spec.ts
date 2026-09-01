import {
  buildDonutSlices,
  arcLabelLines,
  donutLayout,
  OTHER_SLICE_ID,
} from "@/components/dashboard/jobsActivityChart";

describe("buildDonutSlices", () => {
  const activities = [
    { label: "Jobsync", hours: 28.1 },
    { label: "Side Project 1", hours: 9.2 },
    { label: "Learning", hours: 8.6 },
  ];

  it("assigns one fixed hue per rank in light mode", () => {
    const slices = buildDonutSlices(activities, 0, "light");

    expect(slices.map((s) => s.color)).toEqual([
      "#2a9d90",
      "#c97e22",
      "#6d4fc7",
    ]);
  });

  it("uses the dark palette in dark mode", () => {
    const slices = buildDonutSlices(activities, 0, "dark");

    expect(slices.map((s) => s.color)).toEqual([
      "#16a89a",
      "#c08438",
      "#8b72e8",
    ]);
  });

  it("keeps each activity's label, hours and identity", () => {
    const slices = buildDonutSlices(activities, 0, "light");

    expect(slices).toHaveLength(3);
    expect(slices[0]).toMatchObject({
      id: "Jobsync",
      label: "Jobsync",
      value: 28.1,
    });
  });

  it("appends a grey Other slice when there are leftover hours", () => {
    const slices = buildDonutSlices(activities, 17.5, "light");

    expect(slices).toHaveLength(4);
    expect(slices[3]).toEqual({
      id: OTHER_SLICE_ID,
      label: "Other",
      value: 17.5,
      color: "#94a3b8",
      breakdown: [],
    });
  });

  it("attaches the leftover activities to the Other slice for the tooltip", () => {
    const otherActivities = [
      { label: "Networking", hours: 10.5 },
      { label: "Interviewing", hours: 7 },
    ];
    const slices = buildDonutSlices(
      activities,
      17.5,
      "light",
      otherActivities,
    );

    expect(slices[3].breakdown).toEqual(otherActivities);
  });

  it("drops zero-hour entries from the Other slice's breakdown", () => {
    const slices = buildDonutSlices(activities, 17.5, "light", [
      { label: "Networking", hours: 17.5 },
      { label: "Unused", hours: 0 },
    ]);

    expect(slices[3].breakdown).toEqual([{ label: "Networking", hours: 17.5 }]);
  });

  it("omits the Other slice when there are no leftover hours", () => {
    const slices = buildDonutSlices(activities, 0, "light");

    expect(slices.some((s) => s.id === OTHER_SLICE_ID)).toBe(false);
  });

  it("drops activities with no logged hours", () => {
    const slices = buildDonutSlices(
      [
        { label: "Jobsync", hours: 4 },
        { label: "Learning", hours: 0 },
      ],
      0,
      "light",
    );

    expect(slices.map((s) => s.label)).toEqual(["Jobsync"]);
  });

  it("returns nothing when there is no activity at all", () => {
    expect(buildDonutSlices([], 0, "light")).toEqual([]);
  });
});

describe("arcLabelLines", () => {
  it("splits the name and the hours onto separate lines", () => {
    expect(
      arcLabelLines(
        {
          id: "Jobsync",
          label: "Jobsync",
          value: 28.1,
          color: "#2a9d90",
        },
        12,
      ),
    ).toEqual(["Jobsync", "28.1h"]);
  });

  it("trims a long activity name so it cannot run off the card", () => {
    expect(
      arcLabelLines(
        {
          id: "x",
          label: "Interview Preparation Deep Dive",
          value: 4,
          color: "#2a9d90",
        },
        12,
      ),
    ).toEqual(["Interview P…", "4h"]);
  });

  it("trims harder when the card only affords a narrow gutter", () => {
    expect(
      arcLabelLines(
        {
          id: "x",
          label: "Interview Preparation Deep Dive",
          value: 4,
          color: "#2a9d90",
        },
        7,
      ),
    ).toEqual(["Interv…", "4h"]);
  });
});

describe("donutLayout", () => {
  it("gives the labels their full gutter when the card has room", () => {
    const layout = donutLayout(400);

    expect(layout.gutter).toBe(100);
    expect(layout.maxLabelChars).toBe(12);
    expect(layout.holeDiameter).toBeCloseTo(148 * 0.72);
  });

  it("assumes the roomy case before the card has measured itself", () => {
    expect(donutLayout(0)).toEqual(donutLayout(348));
  });

  it("spends gutter, not donut, as the card narrows", () => {
    const layout = donutLayout(320);

    expect(layout.gutter).toBe(86);
    expect(layout.maxLabelChars).toBe(10);
    expect(layout.holeDiameter).toBeCloseTo(148 * 0.72);
  });

  it("shrinks the donut only once the gutter has bottomed out", () => {
    const layout = donutLayout(260);

    expect(layout.gutter).toBe(76);
    expect(layout.maxLabelChars).toBe(8);
    expect(layout.holeDiameter).toBeCloseTo(108 * 0.72);
  });
});
