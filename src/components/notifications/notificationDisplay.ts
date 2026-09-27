import type {
  BoardErrorCode,
  BoardPayload,
  ErrorPayload,
  NotificationItem,
  RunPayload,
} from "@/models/notification.model";

const BOARD_COPY: Record<BoardErrorCode, string> = {
  not_found: "returned 404 — the company may have moved ATS.",
  timeout: "did not respond.",
  rate_limited: "rate limited the request.",
  http_error: "returned an error.",
  parse: "returned data that could not be read.",
  network: "could not be reached.",
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const monthDay = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function isErrorNotification(n: NotificationItem): boolean {
  return n.kind !== "run";
}

export function describeNotification(n: NotificationItem) {
  const base = `/dashboard/automations/${n.automation.id}`;
  const name = `“${n.automation.name}”`;

  if (n.kind === "board") {
    const p = n.payload as BoardPayload;
    const repeat =
      n.occurrences > 1
        ? ` Failed on ${n.occurrences} runs since ${monthDay(new Date(n.createdAt))}.`
        : "";
    return {
      icon: "warn" as const,
      title: "Job board unreachable",
      lead: `${p.provider} · ${p.companyName}`,
      detail: ` ${BOARD_COPY[p.code]}${repeat}`,
      code: p.reason,
      link: { label: "Edit watchlist", href: `${base}?edit=1` },
    };
  }

  if (n.kind === "error") {
    const p = n.payload as ErrorPayload;
    const boards = p.boards.length
      ? ` (${p.boards.map((b) => b.companyName).join(", ")})`
      : "";
    return {
      icon: "fail" as const,
      title: "Automation failed",
      lead: plural(p.jobsSaved, "job") + " saved",
      // Reasons may already end in a period ("…no longer exists.").
      detail: ` · ${name} stopped: ${p.reason.replace(/\.$/, "")}${boards}.`,
      code: null,
      link: { label: "Open automation", href: `${base}?tab=history` },
    };
  }

  const p = n.payload as RunPayload;
  const parts = [` · ${p.jobsSearched} scanned`];
  if (p.belowThreshold > 0) parts.push(`${p.belowThreshold} below match threshold`);
  if (p.boardsFailed > 0) parts.push(`${plural(p.boardsFailed, "board")} failed`);
  if (p.aiError) parts.push("AI unavailable, rest saved without analysis");
  return {
    icon: "run" as const,
    title: `${name} finished`,
    lead: p.jobsSaved > 0 ? `${plural(p.jobsSaved, "job")} saved` : "No new jobs",
    detail: parts.join(" · "),
    code: null,
    link:
      p.jobsSaved > 0
        ? { label: `Review ${plural(p.jobsSaved, "new job")}`, href: `${base}?tab=jobs` }
        : null,
  };
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const DAY = 24 * 60 * 60 * 1000;

export function formatShortAge(date: Date, now: Date = new Date()): string {
  const d = new Date(date);
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  const days = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / DAY);
  if (days === 0) {
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h`;
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return monthDay(d);
}

export function formatClock(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function groupByDay(items: NotificationItem[], now: Date = new Date()) {
  const today = startOfDay(now).getTime();
  // Week starts Monday.
  const weekStart = today - ((now.getDay() + 6) % 7) * DAY;
  const label = (d: Date) => {
    const t = startOfDay(new Date(d)).getTime();
    if (t === today) return "Today";
    if (t === today - DAY) return "Yesterday";
    if (t >= weekStart) return "Earlier this week";
    return "Earlier";
  };
  const order = ["Today", "Yesterday", "Earlier this week", "Earlier"];
  return order
    .map((l) => ({ label: l, items: items.filter((i) => label(i.occurredAt) === l) }))
    .filter((g) => g.items.length > 0);
}
