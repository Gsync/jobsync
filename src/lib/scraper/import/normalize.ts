export type WorkplaceLabel = "Remote" | "Hybrid" | "Onsite";

/**
 * Infers a work arrangement from the location, title and the start of the
 * description. Benefit phrases such as "remote workspace stipend" are ignored
 * so an on-site role is not mislabelled.
 */
export function inferWorkplaceType(
  location: string,
  title: string,
  description: string,
): WorkplaceLabel | undefined {
  const sources = [
    location.toLowerCase(),
    title.toLowerCase(),
    description.slice(0, 600).toLowerCase(),
  ];
  for (const source of sources) {
    if (/\bhybrid\b/.test(source)) return "Hybrid";
    const withoutRemoteBenefits = source.replace(
      /\bremote\s+(?:workspace|stipend|office|team|employees?|benefits?)\b/g,
      " ",
    );
    if (/\bremote\b/.test(withoutRemoteBenefits)) return "Remote";
    if (/\bon[- ]?site\b|\bin[- ]office\b/.test(source)) return "Onsite";
  }
  return undefined;
}

/** Maps a provider's workplace label to the form's three stored labels. */
export function normalizeWorkplaceLabel(
  input?: string | null,
): WorkplaceLabel | undefined {
  const value = (input ?? "").toLowerCase();
  if (/\bhybrid\b/.test(value)) return "Hybrid";
  if (/\bremote\b|\btelecommut|\bwork from home\b|\bwfh\b/.test(value)) {
    return "Remote";
  }
  if (/\bon[\s-]?site\b|\bin[\s-]?office\b|\boffice\b/.test(value)) {
    return "Onsite";
  }
  return undefined;
}

/**
 * Folds a provider's employment label into JobSync's three job types. Labels
 * like "Full Time Exempt", "Temporary" and "Internship" would otherwise fail
 * the exact enum match.
 */
export function normalizeEmploymentType(input?: string | null): string {
  const value = (input ?? "").toLowerCase();
  if (/\bpart[\s-]?time\b/.test(value)) return "Part-time";
  if (
    /\b(contract|contractor|temporary|temp|intern|internship|volunteer|freelance|seasonal)\b/.test(
      value,
    )
  ) {
    return "Contract";
  }
  return "Full-time";
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  CAD: "$",
  AUD: "$",
  NZD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
};

function formatAmount(value: number, currency?: string): string {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
  if (!currency) return formatted;
  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()];
  return symbol ? `${symbol}${formatted}` : `${formatted} ${currency}`;
}

function numeric(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function salaryFromObject(value: Record<string, unknown>): string | undefined {
  const currency =
    typeof value.currency === "string" ? value.currency : undefined;
  const amount = value.value;

  if (amount && typeof amount === "object") {
    const range = amount as Record<string, unknown>;
    const min = numeric(range.minValue ?? range.value);
    const max = numeric(range.maxValue);
    if (min !== undefined && max !== undefined && min !== max) {
      return `${formatAmount(min, currency)} - ${formatAmount(max, currency)}`;
    }
    if (min !== undefined) return formatAmount(min, currency);
  }

  const min = numeric(value.minValue ?? value.min);
  const max = numeric(value.maxValue ?? value.max);
  if (min !== undefined && max !== undefined && min !== max) {
    return `${formatAmount(min, currency)} - ${formatAmount(max, currency)}`;
  }
  if (min !== undefined) return formatAmount(min, currency);

  const single = numeric(amount);
  return single !== undefined ? formatAmount(single, currency) : undefined;
}

/** Formats a salary from a string, number or schema.org MonetaryAmount. */
export function formatSalary(input: unknown): string | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input === "string") {
    const trimmed = input.trim();
    return /\d/.test(trimmed) ? trimmed : undefined;
  }
  if (typeof input === "number") {
    return Number.isFinite(input) ? formatAmount(input) : undefined;
  }
  if (typeof input === "object") {
    return salaryFromObject(input as Record<string, unknown>);
  }
  return undefined;
}
