import { formatUrl } from "@/lib/utils";

// The subtitle and the summary card show a host, not a full URL
export function hostnameOf(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(formatUrl(url)).hostname;
  } catch {
    return null;
  }
}
