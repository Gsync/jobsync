import { TopActivityType } from "@/actions/dashboard.actions";

// Donut hues, validated for colorblind separation against each theme's
// card surface. The app's own --chart-* tokens fail that check here:
// light --chart-3 (#274754) reads as near-black grey in a donut.
const SERIES_COLORS = {
  light: ["#2a9d90", "#c97e22", "#6d4fc7"],
  dark: ["#16a89a", "#c08438", "#8b72e8"],
} as const;

const OTHER_COLOR = { light: "#94a3b8", dark: "#64748b" } as const;

export const OTHER_SLICE_ID = "__other__";

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  color: string;
}

// Hues are assigned by rank and never cycled, so a slice keeps its color
// for as long as the activity keeps its position.
export function buildDonutSlices(
  topActivities: TopActivityType[],
  otherHours: number,
  theme: "light" | "dark",
): DonutSlice[] {
  const slices: DonutSlice[] = topActivities
    .filter((activity) => activity.hours > 0)
    .map((activity, index) => ({
      id: activity.label,
      label: activity.label,
      value: activity.hours,
      color: SERIES_COLORS[theme][index],
    }));

  if (otherHours > 0) {
    slices.push({
      id: OTHER_SLICE_ID,
      label: "Other",
      value: otherHours,
      color: OTHER_COLOR[theme],
    });
  }

  return slices;
}

// Arc link label text, kept neutral rather than tinted from the slice so
// the grey "Other" hue never has to double as readable body text.
export const ARC_LABEL_TEXT_COLOR = {
  light: "#334155",
  dark: "#e2e8f0",
} as const;

// Arc link label geometry. The gutters either side of the donut hold these
// labels; anything wider than the gutter runs off the SVG and is clipped.
const ARC_LABEL_CHAR_WIDTH = 6;
const ARC_LABEL_LINK_LENGTH = 26;
const MAX_ARC_LABEL_GUTTER = 100;
const MIN_ARC_LABEL_GUTTER = 76;

// The chart box is 200px tall with 26px above and below the donut.
export const CHART_HEIGHT = 200;
const CHART_VERTICAL_MARGIN = 26;
const MAX_DONUT_DIAMETER = CHART_HEIGHT - CHART_VERTICAL_MARGIN * 2;
const INNER_RADIUS_RATIO = 0.72;

// Width the card assumes before it has measured itself.
const FULL_CHART_WIDTH = MAX_ARC_LABEL_GUTTER * 2 + MAX_DONUT_DIAMETER;

export interface DonutLayout {
  gutter: number;
  maxLabelChars: number;
  holeDiameter: number;
}

// nivo sizes the donut from min(width - gutters, height), so fixed gutters
// make a narrow card shrink the donut into its own centre text. Letting the
// gutters give way first spends label characters instead, and the caller
// gets back the hole it has left to fit that centre text into.
export function donutLayout(width: number): DonutLayout {
  const available = width > 0 ? width : FULL_CHART_WIDTH;
  const gutter = Math.max(
    MIN_ARC_LABEL_GUTTER,
    Math.min(MAX_ARC_LABEL_GUTTER, (available - MAX_DONUT_DIAMETER) / 2),
  );
  const diameter = Math.max(
    0,
    Math.min(MAX_DONUT_DIAMETER, available - gutter * 2),
  );

  return {
    gutter,
    maxLabelChars: Math.floor(
      (gutter - ARC_LABEL_LINK_LENGTH) / ARC_LABEL_CHAR_WIDTH,
    ),
    holeDiameter: diameter * INNER_RADIUS_RATIO,
  };
}

// The label renders as two lines, so the name is trimmed rather than left
// to run off the card edge.
export function arcLabelLines(
  slice: DonutSlice,
  maxChars: number,
): [string, string] {
  const name =
    slice.label.length > maxChars
      ? `${slice.label.slice(0, maxChars - 1).trimEnd()}…`
      : slice.label;

  return [name, `${slice.value}h`];
}
