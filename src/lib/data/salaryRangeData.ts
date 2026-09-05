// 10,000-wide bands: the cmdk filter is a plain includes(), so a typed
// number lands on a suggestion instead of falling through to "Create:".
const MID_BANDS = Array.from(
  { length: 25 },
  (_, i) => `${50 + i * 10},000 - ${60 + i * 10},000`,
);

// id === value === label so a picked preset stores its own text through
// Combobox's normal select path.
export const SALARY_RANGES = ["Under 50,000", ...MID_BANDS, "300,000+"].map(
  (range) => ({ id: range, value: range, label: range }),
);
