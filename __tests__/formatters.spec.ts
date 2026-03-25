import {
  formatDate,
  formatDateShort,
  formatDateLong,
  formatDateTime,
  formatDateTimeSeconds,
  formatMonthYear,
  formatDateCompact,
  formatTime,
  formatTimeSeconds,
  formatISODate,
  formatWeekdayDate,
  formatNumber,
  formatPercent,
  formatDecimal,
  formatCurrency,
  formatRelativeTime,
  setFormatOverrides,
} from "@/lib/formatters";

const LOCALES = ["en", "de", "fr", "es"] as const;
const REF_DATE = new Date("2026-03-23T14:30:45");
const REF_ISO = "2026-03-23T14:30:45";
const REF_TIMESTAMP = REF_DATE.getTime();

// Reset format overrides before each test to ensure clean defaults
beforeEach(() => {
  setFormatOverrides(undefined);
});

// ─── Date Formatting ──────────────────────────────────────────────────

describe("formatDate", () => {
  it.each(LOCALES)("returns a non-empty string for %s locale", (locale) => {
    const result = formatDate(REF_DATE, locale);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("accepts a custom pattern", () => {
    const result = formatDate(REF_DATE, "en", "yyyy-MM-dd");
    expect(result).toBe("2026-03-23");
  });

  it("defaults to PP pattern when no pattern provided", () => {
    const withDefault = formatDate(REF_DATE, "en");
    const withPP = formatDate(REF_DATE, "en", "PP");
    expect(withDefault).toBe(withPP);
  });

  it("accepts a string date input", () => {
    const result = formatDate(REF_ISO, "en", "yyyy-MM-dd");
    expect(result).toBe("2026-03-23");
  });

  it("accepts a numeric timestamp input", () => {
    const result = formatDate(REF_TIMESTAMP, "en", "yyyy-MM-dd");
    expect(result).toBe("2026-03-23");
  });
});

describe("formatDateShort", () => {
  it.each(LOCALES)(
    "returns a string containing the year for %s locale",
    (locale) => {
      const result = formatDateShort(REF_DATE, locale);
      expect(result).toBeTruthy();
      expect(result).toContain("2026");
    },
  );

  it("formats with English month abbreviation for en", () => {
    const result = formatDateShort(REF_DATE, "en");
    expect(result).toMatch(/Mar/);
    expect(result).toContain("23");
  });

  it("formats with German month name for de", () => {
    const result = formatDateShort(REF_DATE, "de");
    expect(result).toMatch(/März|Mär/);
    expect(result).toContain("23");
  });

  it("formats with French month name for fr", () => {
    const result = formatDateShort(REF_DATE, "fr");
    expect(result).toMatch(/mars/i);
    expect(result).toContain("23");
  });

  it("formats with Spanish month name for es", () => {
    const result = formatDateShort(REF_DATE, "es");
    expect(result).toMatch(/mar/i);
    expect(result).toContain("23");
  });

  it("accepts a string date input", () => {
    const result = formatDateShort(REF_ISO, "en");
    expect(result).toContain("2026");
  });

  it("accepts a numeric timestamp input", () => {
    const result = formatDateShort(REF_TIMESTAMP, "en");
    expect(result).toContain("2026");
  });
});

describe("formatDateLong", () => {
  it.each(LOCALES)(
    "returns a string containing the year for %s locale",
    (locale) => {
      const result = formatDateLong(REF_DATE, locale);
      expect(result).toBeTruthy();
      expect(result).toContain("2026");
    },
  );

  it("includes English weekday name for en", () => {
    const result = formatDateLong(REF_DATE, "en");
    expect(result).toMatch(/Monday/);
    expect(result).toMatch(/March/);
  });

  it("includes German weekday name for de", () => {
    const result = formatDateLong(REF_DATE, "de");
    expect(result).toMatch(/Montag/);
    expect(result).toMatch(/März/);
  });

  it("includes French weekday name for fr", () => {
    const result = formatDateLong(REF_DATE, "fr");
    expect(result).toMatch(/lundi/);
    expect(result).toMatch(/mars/);
  });

  it("includes Spanish weekday name for es", () => {
    const result = formatDateLong(REF_DATE, "es");
    expect(result).toMatch(/lunes/);
    expect(result).toMatch(/marzo/);
  });

  it("accepts a string date input", () => {
    const result = formatDateLong(REF_ISO, "de");
    expect(result).toMatch(/Montag/);
  });

  it("accepts a numeric timestamp input", () => {
    const result = formatDateLong(REF_TIMESTAMP, "fr");
    expect(result).toMatch(/lundi/);
  });
});

describe("formatDateTime", () => {
  it.each(LOCALES)(
    "returns a string containing date and time info for %s locale",
    (locale) => {
      const result = formatDateTime(REF_DATE, locale);
      expect(result).toBeTruthy();
      // Should contain the day number
      expect(result).toContain("23");
      // Should contain time-related content (minutes)
      expect(result).toMatch(/30/);
    },
  );

  it("contains AM/PM indicator for en locale", () => {
    const result = formatDateTime(REF_DATE, "en");
    expect(result).toMatch(/PM/i);
  });

  it("contains 24h time format for de locale", () => {
    const result = formatDateTime(REF_DATE, "de");
    expect(result).toMatch(/14:30/);
  });

  it("accepts a string date input", () => {
    const result = formatDateTime(REF_ISO, "en");
    expect(result).toContain("23");
  });

  it("accepts a numeric timestamp input", () => {
    const result = formatDateTime(REF_TIMESTAMP, "de");
    expect(result).toContain("23");
  });
});

describe("formatDateTimeSeconds", () => {
  it.each(LOCALES)(
    "returns a string containing seconds for %s locale",
    (locale) => {
      const result = formatDateTimeSeconds(REF_DATE, locale);
      expect(result).toBeTruthy();
      expect(result).toContain("23");
      // Should contain seconds (45)
      expect(result).toMatch(/45/);
    },
  );

  it("contains AM/PM indicator for en locale", () => {
    const result = formatDateTimeSeconds(REF_DATE, "en");
    expect(result).toMatch(/PM/i);
  });

  it("contains 24h time format for de locale", () => {
    const result = formatDateTimeSeconds(REF_DATE, "de");
    expect(result).toMatch(/14:30:45/);
  });

  it("accepts a string date input", () => {
    const result = formatDateTimeSeconds(REF_ISO, "en");
    expect(result).toMatch(/45/);
  });
});

describe("formatMonthYear", () => {
  it.each(LOCALES)(
    "returns a string containing the year for %s locale",
    (locale) => {
      const result = formatMonthYear(REF_DATE, locale);
      expect(result).toBeTruthy();
      expect(result).toContain("2026");
    },
  );

  it("uses English month abbreviation for en", () => {
    const result = formatMonthYear(REF_DATE, "en");
    expect(result).toMatch(/Mar/);
  });

  it("uses German month abbreviation for de", () => {
    const result = formatMonthYear(REF_DATE, "de");
    expect(result).toMatch(/Mär|März/);
  });

  it("uses French month abbreviation for fr", () => {
    const result = formatMonthYear(REF_DATE, "fr");
    expect(result).toMatch(/mars/i);
  });

  it("uses Spanish month abbreviation for es", () => {
    const result = formatMonthYear(REF_DATE, "es");
    expect(result).toMatch(/mar/i);
  });

  it("does not contain the day number", () => {
    // Month + year only, no day
    const result = formatMonthYear(REF_DATE, "en");
    // Should not contain "23" as a standalone day (it could appear in year)
    expect(result).toMatch(/^Mar\s+2026$/);
  });

  it("accepts a string date input", () => {
    const result = formatMonthYear(REF_ISO, "en");
    expect(result).toContain("2026");
  });

  it("accepts a numeric timestamp input", () => {
    const result = formatMonthYear(REF_TIMESTAMP, "de");
    expect(result).toContain("2026");
  });
});

describe("formatDateCompact", () => {
  it.each(LOCALES)(
    "returns a non-empty string for %s locale",
    (locale) => {
      const result = formatDateCompact(REF_DATE, locale);
      expect(result).toBeTruthy();
      expect(result).toContain("23");
    },
  );

  it("contains month abbreviation and time for en", () => {
    const result = formatDateCompact(REF_DATE, "en");
    expect(result).toMatch(/Mar/);
    expect(result).toMatch(/30/);
  });

  it("accepts a string date input", () => {
    const result = formatDateCompact(REF_ISO, "en");
    expect(result).toBeTruthy();
  });
});

describe("formatTime", () => {
  it.each(LOCALES)(
    "returns a non-empty string for %s locale",
    (locale) => {
      const result = formatTime(REF_DATE, locale);
      expect(result).toBeTruthy();
      expect(result).toMatch(/30/); // minutes always present
    },
  );

  it("uses 12h format with AM/PM for en locale (default)", () => {
    const result = formatTime(REF_DATE, "en");
    expect(result).toMatch(/PM/i);
    expect(result).toMatch(/2:30|2\.30/);
  });

  it("uses 24h format for de locale (default)", () => {
    const result = formatTime(REF_DATE, "de");
    expect(result).toMatch(/14:30|14\.30/);
  });

  it("uses 24h format for fr locale (default)", () => {
    const result = formatTime(REF_DATE, "fr");
    expect(result).toMatch(/14:30|14 h 30|14h30/);
  });

  it("uses 24h format for es locale (default)", () => {
    const result = formatTime(REF_DATE, "es");
    expect(result).toMatch(/14:30|14\.30/);
  });

  it("accepts a string date input", () => {
    const result = formatTime(REF_ISO, "en");
    expect(result).toMatch(/30/);
  });

  it("accepts a numeric timestamp input", () => {
    const result = formatTime(REF_TIMESTAMP, "de");
    expect(result).toMatch(/30/);
  });
});

describe("formatTimeSeconds", () => {
  it.each(LOCALES)(
    "returns a string containing seconds for %s locale",
    (locale) => {
      const result = formatTimeSeconds(REF_DATE, locale);
      expect(result).toBeTruthy();
      expect(result).toMatch(/45/); // seconds always present
    },
  );

  it("uses 12h format with AM/PM for en locale", () => {
    const result = formatTimeSeconds(REF_DATE, "en");
    expect(result).toMatch(/PM/i);
  });

  it("uses 24h format for de locale", () => {
    const result = formatTimeSeconds(REF_DATE, "de");
    expect(result).toMatch(/14/);
  });

  it("accepts a string date input", () => {
    const result = formatTimeSeconds(REF_ISO, "en");
    expect(result).toMatch(/45/);
  });
});

describe("formatISODate", () => {
  it("returns the ISO date string for a Date object", () => {
    expect(formatISODate(REF_DATE)).toBe("2026-03-23");
  });

  it("returns the ISO date string for a string input", () => {
    expect(formatISODate(REF_ISO)).toBe("2026-03-23");
  });

  it("returns the ISO date string for a numeric timestamp", () => {
    expect(formatISODate(REF_TIMESTAMP)).toBe("2026-03-23");
  });

  it("is locale-independent (same output regardless of any locale context)", () => {
    // formatISODate does not take a locale parameter; verify consistent output
    const result1 = formatISODate(REF_DATE);
    const result2 = formatISODate(new Date("2026-03-23T14:30:45"));
    expect(result1).toBe(result2);
    expect(result1).toBe("2026-03-23");
  });

  it("formats different dates correctly", () => {
    expect(formatISODate(new Date("2025-01-01T00:00:00"))).toBe("2025-01-01");
    expect(formatISODate(new Date("2024-12-31T23:59:59"))).toBe("2024-12-31");
    expect(formatISODate(new Date("2000-06-15T12:00:00"))).toBe("2000-06-15");
  });

  it("pads single-digit months and days with leading zeros", () => {
    expect(formatISODate(new Date("2026-01-05T10:00:00"))).toBe("2026-01-05");
    expect(formatISODate(new Date("2026-09-09T10:00:00"))).toBe("2026-09-09");
  });
});

describe("formatWeekdayDate", () => {
  it.each(LOCALES)(
    "returns a string containing the year for %s locale",
    (locale) => {
      const result = formatWeekdayDate(REF_DATE, locale);
      expect(result).toBeTruthy();
      expect(result).toContain("2026");
    },
  );

  it("includes abbreviated English weekday for en", () => {
    const result = formatWeekdayDate(REF_DATE, "en");
    expect(result).toMatch(/Mon/);
    expect(result).toMatch(/Mar/);
    expect(result).toContain("23");
  });

  it("includes abbreviated German weekday for de", () => {
    const result = formatWeekdayDate(REF_DATE, "de");
    expect(result).toMatch(/Mo/);
    expect(result).toContain("23");
  });

  it("includes abbreviated French weekday for fr", () => {
    const result = formatWeekdayDate(REF_DATE, "fr");
    expect(result).toMatch(/lun/i);
    expect(result).toContain("23");
  });

  it("includes abbreviated Spanish weekday for es", () => {
    const result = formatWeekdayDate(REF_DATE, "es");
    expect(result).toMatch(/lun/i);
    expect(result).toContain("23");
  });

  it("accepts a string date input", () => {
    const result = formatWeekdayDate(REF_ISO, "en");
    expect(result).toMatch(/Mon/);
  });

  it("accepts a numeric timestamp input", () => {
    const result = formatWeekdayDate(REF_TIMESTAMP, "de");
    expect(result).toMatch(/Mo/);
  });
});

// ─── Number Formatting ────────────────────────────────────────────────

describe("formatNumber", () => {
  it.each(LOCALES)(
    "returns a non-empty string for %s locale",
    (locale) => {
      const result = formatNumber(1234.5, locale);
      expect(result).toBeTruthy();
    },
  );

  it("uses comma as thousands separator and period as decimal for en", () => {
    const result = formatNumber(1234.5, "en");
    expect(result).toContain(",");
    expect(result).toMatch(/1,234\.5/);
  });

  it("uses period as thousands separator and comma as decimal for de", () => {
    const result = formatNumber(1234.5, "de");
    expect(result).toMatch(/1\.234,5/);
  });

  it("uses narrow no-break space as thousands separator for fr", () => {
    const result = formatNumber(1234.5, "fr");
    // French uses narrow no-break space (U+202F) or regular space as thousands separator
    // and comma as decimal separator
    expect(result).toMatch(/1.234,5/);
  });

  it("formats correctly for es locale", () => {
    const result = formatNumber(1234.5, "es");
    expect(result).toBeTruthy();
    // Spanish typically uses period as thousands sep and comma as decimal
    // but this can vary by Intl implementation
    expect(result.length).toBeGreaterThan(0);
  });

  it("formats zero correctly", () => {
    const result = formatNumber(0, "en");
    expect(result).toBe("0");
  });

  it("formats negative numbers", () => {
    const result = formatNumber(-1234, "en");
    expect(result).toContain("1,234");
    expect(result).toContain("-");
  });

  it("formats large numbers with grouping", () => {
    const result = formatNumber(1000000, "en");
    expect(result).toBe("1,000,000");
  });

  it("accepts additional Intl.NumberFormatOptions", () => {
    const result = formatNumber(1234.567, "en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(result).toBe("1,234.57");
  });
});

describe("formatPercent", () => {
  it.each(LOCALES)(
    "returns a non-empty string for %s locale",
    (locale) => {
      const result = formatPercent(85, locale);
      expect(result).toBeTruthy();
      expect(result).toContain("%");
    },
  );

  it("formats 85 as 85% for en", () => {
    const result = formatPercent(85, "en");
    expect(result).toBe("85%");
  });

  it("formats 85 with space before % for de", () => {
    const result = formatPercent(85, "de");
    // German uses "85 %" (with non-breaking space) or "85%"
    expect(result).toMatch(/85\s*%/);
  });

  it("formats 85 with space before % for fr", () => {
    const result = formatPercent(85, "fr");
    // French uses "85 %" (with non-breaking space)
    expect(result).toMatch(/85\s*%/);
  });

  it("formats 85 for es", () => {
    const result = formatPercent(85, "es");
    expect(result).toMatch(/85\s*%/);
  });

  it("formats 0 as 0%", () => {
    const result = formatPercent(0, "en");
    expect(result).toMatch(/0\s*%/);
  });

  it("formats 100 as 100%", () => {
    const result = formatPercent(100, "en");
    expect(result).toMatch(/100\s*%/);
  });

  it("divides the input by 100 (value 50 produces 50%)", () => {
    // The function takes percentage as a whole number (e.g., 50 for 50%)
    // and divides by 100 internally before passing to Intl with style: "percent"
    const result = formatPercent(50, "en");
    expect(result).toMatch(/50\s*%/);
  });
});

describe("formatDecimal", () => {
  it.each(LOCALES)(
    "returns a non-empty string for %s locale",
    (locale) => {
      const result = formatDecimal(3.14159, locale, 2);
      expect(result).toBeTruthy();
    },
  );

  it("uses period as decimal separator for en", () => {
    const result = formatDecimal(3.14159, "en", 2);
    expect(result).toBe("3.14");
  });

  it("uses comma as decimal separator for de", () => {
    const result = formatDecimal(3.14159, "de", 2);
    expect(result).toBe("3,14");
  });

  it("uses comma as decimal separator for fr", () => {
    const result = formatDecimal(3.14159, "fr", 2);
    expect(result).toBe("3,14");
  });

  it("uses comma as decimal separator for es", () => {
    const result = formatDecimal(3.14159, "es", 2);
    expect(result).toBe("3,14");
  });

  it("defaults to 1 decimal place when decimals not specified", () => {
    const result = formatDecimal(3.14159, "en");
    expect(result).toBe("3.1");
  });

  it("formats with 0 decimal places", () => {
    const result = formatDecimal(3.14159, "en", 0);
    expect(result).toBe("3");
  });

  it("formats with 4 decimal places", () => {
    const result = formatDecimal(3.14159, "en", 4);
    expect(result).toBe("3.1416");
  });

  it("pads with trailing zeros when needed", () => {
    const result = formatDecimal(3, "en", 2);
    expect(result).toBe("3.00");
  });

  it("formats large numbers with grouping and decimals for en", () => {
    const result = formatDecimal(1234.5, "en", 2);
    expect(result).toBe("1,234.50");
  });

  it("formats large numbers with grouping and decimals for de", () => {
    const result = formatDecimal(1234.5, "de", 2);
    expect(result).toBe("1.234,50");
  });
});

// ─── Currency Formatting ──────────────────────────────────────────────

describe("formatCurrency", () => {
  it.each(LOCALES)(
    "returns a non-empty string for %s locale",
    (locale) => {
      const result = formatCurrency(1234, locale, "EUR");
      expect(result).toBeTruthy();
    },
  );

  it("formats EUR for en locale", () => {
    const result = formatCurrency(1234, "en", "EUR");
    // en typically shows currency symbol before the number
    expect(result).toMatch(/1,234/);
    expect(result).toMatch(/€|EUR/);
  });

  it("formats EUR for de locale", () => {
    const result = formatCurrency(1234, "de", "EUR");
    // de typically shows number first, then currency symbol
    expect(result).toMatch(/1\.234/);
    expect(result).toMatch(/€|EUR/);
  });

  it("formats EUR for fr locale", () => {
    const result = formatCurrency(1234, "fr", "EUR");
    // fr typically shows number first with space, then currency symbol
    expect(result).toMatch(/€|EUR/);
    // French uses narrow no-break space as thousands separator
    expect(result).toMatch(/1.234/);
  });

  it("formats EUR for es locale", () => {
    const result = formatCurrency(1234, "es", "EUR");
    expect(result).toMatch(/€|EUR/);
  });

  it("defaults to EUR when no currency specified", () => {
    const result = formatCurrency(1234, "en");
    expect(result).toMatch(/€|EUR/);
  });

  it("formats USD correctly", () => {
    const result = formatCurrency(1234, "en", "USD");
    expect(result).toMatch(/\$/);
    expect(result).toMatch(/1,234/);
  });

  it("formats GBP correctly", () => {
    const result = formatCurrency(1234, "en", "GBP");
    expect(result).toMatch(/£|GBP/);
  });

  it("formats zero amount", () => {
    const result = formatCurrency(0, "en", "EUR");
    expect(result).toMatch(/0/);
    expect(result).toMatch(/€|EUR/);
  });

  it("formats negative amounts", () => {
    const result = formatCurrency(-1234, "en", "EUR");
    expect(result).toMatch(/1,234/);
    expect(result).toMatch(/-/);
  });

  it("does not show fraction digits (maximumFractionDigits: 0)", () => {
    const result = formatCurrency(1234.56, "en", "EUR");
    // Should not contain ".56" or ",56" since maxFractionDigits is 0
    expect(result).not.toMatch(/\.56/);
    expect(result).not.toMatch(/,56/);
  });
});

// ─── Relative Time ────────────────────────────────────────────────────

describe("formatRelativeTime", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-23T16:30:45"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each(LOCALES)(
    "returns a non-empty string for %s locale",
    (locale) => {
      const twoHoursAgo = new Date("2026-03-23T14:30:45");
      const result = formatRelativeTime(twoHoursAgo, locale);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    },
  );

  it('formats "2 hours ago" in English', () => {
    const twoHoursAgo = new Date("2026-03-23T14:30:45");
    const result = formatRelativeTime(twoHoursAgo, "en");
    expect(result).toMatch(/2 hours ago/);
  });

  it('formats "vor 2 Stunden" in German', () => {
    const twoHoursAgo = new Date("2026-03-23T14:30:45");
    const result = formatRelativeTime(twoHoursAgo, "de");
    expect(result).toMatch(/vor 2 Stunden/);
  });

  it('formats "il y a 2 heures" in French', () => {
    const twoHoursAgo = new Date("2026-03-23T14:30:45");
    const result = formatRelativeTime(twoHoursAgo, "fr");
    expect(result).toMatch(/il y a 2 heures/);
  });

  it('formats "hace 2 horas" in Spanish', () => {
    const twoHoursAgo = new Date("2026-03-23T14:30:45");
    const result = formatRelativeTime(twoHoursAgo, "es");
    expect(result).toMatch(/hace 2 horas/);
  });

  it("formats minutes ago correctly", () => {
    const thirtyMinutesAgo = new Date("2026-03-23T16:00:45");
    const result = formatRelativeTime(thirtyMinutesAgo, "en");
    expect(result).toMatch(/30 minutes ago/);
  });

  it("formats days ago correctly", () => {
    const twoDaysAgo = new Date("2026-03-21T16:30:45");
    const result = formatRelativeTime(twoDaysAgo, "en");
    expect(result).toMatch(/2 days ago/);
  });

  it("formats days ago in German", () => {
    const twoDaysAgo = new Date("2026-03-21T16:30:45");
    const result = formatRelativeTime(twoDaysAgo, "de");
    // Intl.RelativeTimeFormat with numeric: "auto" may output "vorgestern"
    // (day before yesterday) instead of "vor 2 Tagen" for exactly 2 days
    expect(result).toMatch(/vor 2 Tagen|vorgestern/);
  });

  it("formats seconds ago for very recent times", () => {
    const tenSecondsAgo = new Date("2026-03-23T16:30:35");
    const result = formatRelativeTime(tenSecondsAgo, "en");
    expect(result).toMatch(/10 seconds ago/);
  });

  it("accepts a string date input", () => {
    const result = formatRelativeTime("2026-03-23T14:30:45", "en");
    expect(result).toMatch(/2 hours ago/);
  });

  it("accepts a numeric timestamp input", () => {
    const twoHoursAgo = new Date("2026-03-23T14:30:45").getTime();
    const result = formatRelativeTime(twoHoursAgo, "en");
    expect(result).toMatch(/2 hours ago/);
  });
});

// ─── setFormatOverrides ───────────────────────────────────────────────

describe("setFormatOverrides", () => {
  it("forces 24h time format when overridden for en locale", () => {
    setFormatOverrides({ timeFormat: "24h" });
    const result = formatTime(REF_DATE, "en");
    // With 24h override, en should show 14:30 instead of 2:30 PM
    expect(result).toMatch(/14/);
    expect(result).not.toMatch(/PM/i);
  });

  it("forces 12h time format when overridden for de locale", () => {
    setFormatOverrides({ timeFormat: "12h" });
    const result = formatTime(REF_DATE, "de");
    // With 12h override, de should show AM/PM style
    expect(result).toMatch(/PM|pm|nachm/i);
  });

  it("reverts to locale defaults when overrides are cleared", () => {
    setFormatOverrides({ timeFormat: "24h" });
    let result = formatTime(REF_DATE, "en");
    expect(result).toMatch(/14/);

    setFormatOverrides(undefined);
    result = formatTime(REF_DATE, "en");
    expect(result).toMatch(/PM/i);
  });

  it("does not affect formatISODate", () => {
    setFormatOverrides({ dateStyle: "long", timeFormat: "12h" });
    expect(formatISODate(REF_DATE)).toBe("2026-03-23");
  });

  it("does not affect formatDateShort (date-fns based)", () => {
    setFormatOverrides({ dateStyle: "long" });
    // formatDateShort uses date-fns "PP" pattern, not Intl dateStyle
    const withOverride = formatDateShort(REF_DATE, "en");
    setFormatOverrides(undefined);
    const withoutOverride = formatDateShort(REF_DATE, "en");
    expect(withOverride).toBe(withoutOverride);
  });
});

// ─── Input Type Consistency ───────────────────────────────────────────

describe("input type consistency", () => {
  const dateObj = REF_DATE;
  const dateStr = REF_ISO;
  const dateNum = REF_TIMESTAMP;

  it("formatDateShort produces consistent results for all input types", () => {
    const fromObj = formatDateShort(dateObj, "en");
    const fromStr = formatDateShort(dateStr, "en");
    const fromNum = formatDateShort(dateNum, "en");
    expect(fromObj).toBe(fromStr);
    expect(fromObj).toBe(fromNum);
  });

  it("formatDateLong produces consistent results for all input types", () => {
    const fromObj = formatDateLong(dateObj, "en");
    const fromStr = formatDateLong(dateStr, "en");
    const fromNum = formatDateLong(dateNum, "en");
    expect(fromObj).toBe(fromStr);
    expect(fromObj).toBe(fromNum);
  });

  it("formatISODate produces consistent results for all input types", () => {
    const fromObj = formatISODate(dateObj);
    const fromStr = formatISODate(dateStr);
    const fromNum = formatISODate(dateNum);
    expect(fromObj).toBe(fromStr);
    expect(fromObj).toBe(fromNum);
  });

  it("formatTime produces consistent results for all input types", () => {
    const fromObj = formatTime(dateObj, "en");
    const fromStr = formatTime(dateStr, "en");
    const fromNum = formatTime(dateNum, "en");
    expect(fromObj).toBe(fromStr);
    expect(fromObj).toBe(fromNum);
  });

  it("formatWeekdayDate produces consistent results for all input types", () => {
    const fromObj = formatWeekdayDate(dateObj, "en");
    const fromStr = formatWeekdayDate(dateStr, "en");
    const fromNum = formatWeekdayDate(dateNum, "en");
    expect(fromObj).toBe(fromStr);
    expect(fromObj).toBe(fromNum);
  });

  it("formatMonthYear produces consistent results for all input types", () => {
    const fromObj = formatMonthYear(dateObj, "en");
    const fromStr = formatMonthYear(dateStr, "en");
    const fromNum = formatMonthYear(dateNum, "en");
    expect(fromObj).toBe(fromStr);
    expect(fromObj).toBe(fromNum);
  });
});

// ─── Unsupported Locale Fallback ──────────────────────────────────────

describe("unsupported locale fallback", () => {
  it("formatDate falls back to enUS for an unknown locale", () => {
    const result = formatDate(REF_DATE, "xx");
    const enResult = formatDate(REF_DATE, "en");
    // Unknown locale should fall back to enUS via getDateFnsLocale
    expect(result).toBe(enResult);
  });

  it("formatDateShort falls back to enUS for an unknown locale", () => {
    const result = formatDateShort(REF_DATE, "xx");
    const enResult = formatDateShort(REF_DATE, "en");
    expect(result).toBe(enResult);
  });

  it("formatNumber handles unknown locale gracefully", () => {
    // Intl.NumberFormat typically falls back to the runtime default
    const result = formatNumber(1234, "xx");
    expect(result).toBeTruthy();
  });

  it("formatCurrency handles unknown locale gracefully", () => {
    const result = formatCurrency(1234, "xx", "EUR");
    expect(result).toBeTruthy();
    expect(result).toMatch(/€|EUR/);
  });
});
