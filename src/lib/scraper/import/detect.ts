import type { DetectedJobUrl, JobImportProvider } from "./types";

/** Parses a pasted URL, tolerating a missing scheme and rejecting non-HTTP. */
export function parseImportUrl(input: string): URL | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function isHost(hostname: string, domain: string): boolean {
  const host = hostname.toLowerCase();
  return host === domain || host.endsWith(`.${domain}`);
}

function segments(url: URL): string[] {
  return url.pathname.split("/").filter(Boolean);
}

function isPostingId(value?: string | null): value is string {
  return !!value && /^[a-zA-Z0-9_-]{4,}$/.test(value);
}

function greenhouseFromUrl(url: URL): DetectedJobUrl | null {
  if (!isHost(url.hostname, "greenhouse.io")) return null;

  // Embed URL: /embed/job_app?for=acme&token=123
  const forToken = url.searchParams.get("for");
  const embedId = url.searchParams.get("token");
  if (forToken && isPostingId(embedId)) {
    return { provider: "greenhouse", token: forToken, id: embedId };
  }

  const parts = segments(url);
  // API URL: /v1/boards/{token}/jobs/{id}
  const boardsIndex = parts.indexOf("boards");
  if (boardsIndex >= 0 && parts[boardsIndex + 2] === "jobs") {
    const token = parts[boardsIndex + 1];
    const id = parts[boardsIndex + 3];
    if (token && isPostingId(id)) {
      return { provider: "greenhouse", token, id };
    }
  }

  // Public URL: /{token}/jobs/{id}
  const jobsIndex = parts.indexOf("jobs");
  if (jobsIndex >= 1) {
    const token = parts[jobsIndex - 1];
    const id = parts[jobsIndex + 1];
    if (token && isPostingId(id)) {
      return { provider: "greenhouse", token, id };
    }
  }

  return null;
}

function leverFromUrl(url: URL): DetectedJobUrl | null {
  if (!isHost(url.hostname, "lever.co")) return null;

  const eu = url.hostname.toLowerCase().startsWith("api.eu.") ||
    url.hostname.toLowerCase().startsWith("jobs.eu.");
  const parts = segments(url);
  // API URL: /v0/postings/{token}/{id}
  const postingsIndex = parts.indexOf("postings");
  const offset = postingsIndex >= 0 ? postingsIndex + 1 : 0;
  const token = parts[offset];
  const id = parts[offset + 1];
  if (token && isPostingId(id)) {
    return { provider: "lever", token, id, eu };
  }

  return null;
}

function ashbyFromUrl(url: URL): DetectedJobUrl | null {
  if (!isHost(url.hostname, "ashbyhq.com")) return null;
  const parts = segments(url);
  // Public URL: /{token}/{id}
  const token = parts[0];
  const id = parts[1];
  if (token && isPostingId(id)) {
    return { provider: "ashby", token, id };
  }
  return null;
}

/** Detects the best source for a posting URL. Unknown sites use "generic". */
export function detectJobUrl(input: string): DetectedJobUrl | null {
  const url = parseImportUrl(input);
  if (!url) return null;

  if (isHost(url.hostname, "linkedin.com")) {
    return { provider: "linkedin" };
  }

  const provider =
    greenhouseFromUrl(url) ?? leverFromUrl(url) ?? ashbyFromUrl(url);
  if (provider) return provider;

  return { provider: "generic" };
}

const SOURCE_BY_HOST: { domain: string; label: string }[] = [
  { domain: "linkedin.com", label: "LinkedIn" },
  { domain: "greenhouse.io", label: "Greenhouse" },
  { domain: "lever.co", label: "Lever" },
  { domain: "ashbyhq.com", label: "Ashby" },
  { domain: "indeed.com", label: "Indeed" },
  { domain: "glassdoor.com", label: "Glassdoor" },
  { domain: "monster.com", label: "Monster" },
  { domain: "ziprecruiter.com", label: "ZipRecruiter" },
  { domain: "jobstreet.com", label: "Job Street" },
  { domain: "google.com", label: "Google" },
];

const KNOWN_SOURCE_LABELS = new Set([
  "LinkedIn",
  "Greenhouse",
  "Lever",
  "Ashby",
  "Indeed",
  "Glassdoor",
  "Monster",
  "ZipRecruiter",
  "Job Street",
  "Google",
]);

function hostSourceLabel(url: URL): string {
  const host = url.hostname.toLowerCase();
  const known = SOURCE_BY_HOST.find((entry) => isHost(host, entry.domain));
  return known?.label ?? "Company Career page";
}

/**
 * Picks a JobSource label. A known job board keeps its own name; a company's
 * own careers page falls back to the seeded "Company Career page" source so
 * imports do not create a JobSource per employer.
 */
export function sourceLabelForUrl(url: URL, siteName?: string): string {
  const fromHost = hostSourceLabel(url);
  if (fromHost !== "Company Career page") return fromHost;

  const normalized = siteName?.trim();
  if (normalized) {
    const known = [...KNOWN_SOURCE_LABELS].find(
      (label) => label.toLowerCase() === normalized.toLowerCase(),
    );
    if (known) return known;
  }

  return fromHost;
}

export function providerSourceLabel(provider: JobImportProvider): string {
  switch (provider) {
    case "linkedin":
      return "LinkedIn";
    case "greenhouse":
      return "Greenhouse";
    case "lever":
      return "Lever";
    case "ashby":
      return "Ashby";
    case "generic":
      return "Company Career page";
  }
}
