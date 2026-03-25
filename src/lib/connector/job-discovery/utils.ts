const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
  "source",
  "fbclid",
  "gclid",
  "msclkid",
  "tk",
  "from",
  "vjk",
];

export function normalizeJobUrl(url: string): string {
  try {
    const parsed = new URL(url);
    TRACKING_PARAMS.forEach((param) => {
      parsed.searchParams.delete(param);
    });
    return parsed.toString();
  } catch {
    return url;
  }
}

export function normalizeForSearch(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

const STOP_WORDS = [
  "senior",
  "jr",
  "junior",
  "sr",
  "inc",
  "llc",
  "ltd",
  "corp",
  "corporation",
  "the",
  "a",
  "an",
  "co",
  "company",
];

export function extractKeywords(str: string): string[] {
  return str
    .toLowerCase()
    .split(/[\s\-_,\.]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.includes(word));
}

export function extractCityName(location: string): string | null {
  const parts = location.split(",");
  if (parts.length > 0) {
    return parts[0].trim().toLowerCase();
  }
  return null;
}
