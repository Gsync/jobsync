import { format } from "date-fns";
import {
  AI_PROVIDER_LABELS,
  type AiCallStatus,
  type AiFailureStatus,
} from "@/models/aiUsage.model";

export function formatTokens(n: number): string {
  // 999,600 would round to "1000K"; switch to M before that happens.
  if (n >= 999_500) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export function formatCount(n: number | null): string {
  return n === null ? "—" : n.toLocaleString("en-US");
}

export function formatSeconds(ms: number | null): string {
  return ms === null ? "—" : `${(ms / 1000).toFixed(1)}s`;
}

// Compares against the passed now, not date-fns' isToday, which reads the
// real clock and so can't be tested.
export function formatCallTime(date: Date, now: Date = new Date()): string {
  const time = format(date, "HH:mm");
  if (format(now, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")) {
    return `Today ${time}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (format(yesterday, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")) {
    return `Yesterday ${time}`;
  }
  return format(date, "MMM d HH:mm");
}

export function formatChange(
  calls: number,
  previous: number,
): { text: string; up: boolean } | null {
  if (previous === 0) return null;
  const pct = Math.round(((calls - previous) / previous) * 100);
  return { text: `${pct > 0 ? "+" : ""}${pct}%`, up: pct > 0 };
}

export function providerLabel(provider: string): string {
  return AI_PROVIDER_LABELS[provider] ?? provider;
}

// Hand-picked like the dashboard charts: dark values are the design's.
export const PROVIDER_COLORS: Record<
  "light" | "dark",
  Record<string, string>
> = {
  dark: {
    ollama: "#60A5FA",
    deepseek: "#F59E0B",
    openai: "#14B8A6",
    gemini: "#C4B5FD",
    openrouter: "#F472B6",
  },
  light: {
    ollama: "#2563EB",
    deepseek: "#D97706",
    openai: "#0D9488",
    gemini: "#7C3AED",
    openrouter: "#DB2777",
  },
};

export const FALLBACK_PROVIDER_COLOR = "#94A3B8";

export const STATUS_META: Record<
  AiCallStatus,
  { label: string; className: string }
> = {
  ok: {
    label: "OK",
    className:
      "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400",
  },
  truncated: {
    label: "Truncated",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400",
  },
  error: {
    label: "Error",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  timed_out: {
    label: "Timed out",
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  },
  interrupted: {
    label: "Interrupted",
    className: "bg-muted text-muted-foreground",
  },
  stopped: { label: "Stopped", className: "bg-muted text-muted-foreground" },
};

export const FAILURE_META: Record<
  AiFailureStatus,
  { label: string; description: string; dotClassName: string }
> = {
  error: {
    label: "Provider error",
    description: "Unreachable, rejected key or rate limit",
    dotClassName: "bg-red-400",
  },
  timed_out: {
    label: "Timed out",
    description: "Hit the time limit before finishing",
    dotClassName: "bg-orange-400",
  },
  truncated: {
    label: "Truncated",
    description: "Hit the output limit before finishing",
    dotClassName: "bg-amber-400",
  },
  interrupted: {
    label: "Interrupted",
    description: "Stream ended early with no error",
    dotClassName: "bg-slate-400",
  },
};
