import {
  formatCallTime,
  formatChange,
  formatCount,
  formatSeconds,
  formatTokens,
  providerLabel,
} from "@/components/settings/ai-usage-settings/format";

it.each([
  [3_650_000, "3.65M"],
  [410_000, "410K"],
  [140_400, "140K"],
  [999_600, "1.00M"],
  [950, "950"],
  [0, "0"],
])("formatTokens(%i) = %s", (n, s) => expect(formatTokens(n)).toBe(s));

it("formats counts with separators and blanks", () => {
  expect(formatCount(4812)).toBe("4,812");
  expect(formatCount(null)).toBe("—");
});

it("formats seconds with one decimal", () => {
  expect(formatSeconds(8400)).toBe("8.4s");
  expect(formatSeconds(400)).toBe("0.4s");
  expect(formatSeconds(null)).toBe("—");
});

it("labels today, yesterday and older calls", () => {
  const now = new Date(2026, 8, 28, 15, 0);
  expect(formatCallTime(new Date(2026, 8, 28, 14, 32), now)).toBe("Today 14:32");
  expect(formatCallTime(new Date(2026, 8, 27, 21, 48), now)).toBe("Yesterday 21:48");
  expect(formatCallTime(new Date(2026, 8, 12, 9, 0), now)).toBe("Sep 12 09:00");
});

it("reports change only against a non-empty previous period", () => {
  expect(formatChange(837, 747)).toEqual({ text: "+12%", up: true });
  expect(formatChange(50, 100)).toEqual({ text: "-50%", up: false });
  expect(formatChange(10, 0)).toBeNull();
});

it("labels providers and falls back to the raw id", () => {
  expect(providerLabel("deepseek")).toBe("DeepSeek");
  expect(providerLabel("mystery")).toBe("mystery");
});
