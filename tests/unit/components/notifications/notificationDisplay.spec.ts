import {
  describeNotification,
  formatShortAge,
  groupByDay,
  isErrorNotification,
} from "@/components/notifications/notificationDisplay";
import type { NotificationItem } from "@/models/notification.model";

const auto = { id: "a-1", name: "Remote Frontend" };
const at = new Date("2026-09-26T10:42:00");
const item = (over: Partial<NotificationItem>): NotificationItem => ({
  id: "n",
  kind: "run",
  payload: {
    status: "completed",
    jobsSearched: 38,
    jobsSaved: 12,
    belowThreshold: 26,
    boardsFailed: 0,
    aiError: null,
  },
  occurrences: 1,
  occurredAt: at,
  createdAt: at,
  readAt: null,
  dismissedAt: null,
  automation: auto,
  ...over,
});

describe("describeNotification", () => {
  it("run with saves links to the automation's jobs tab", () => {
    expect(describeNotification(item({}))).toEqual({
      icon: "run",
      title: "“Remote Frontend” finished",
      lead: "12 jobs saved",
      detail: " · 38 scanned · 26 below match threshold",
      hint: null,
      link: { label: "Review 12 new jobs", href: "/dashboard/automations/a-1?tab=jobs" },
    });
  });

  it("run with no saves has no link", () => {
    const d = describeNotification(
      item({ payload: { status: "completed", jobsSearched: 19, jobsSaved: 0, belowThreshold: 0, boardsFailed: 0, aiError: null } }),
    );
    expect(d.lead).toBe("No new jobs");
    expect(d.link).toBeNull();
  });

  it("singular job", () => {
    const d = describeNotification(
      item({ payload: { status: "completed", jobsSearched: 5, jobsSaved: 1, belowThreshold: 0, boardsFailed: 0, aiError: null } }),
    );
    expect(d.lead).toBe("1 job saved");
    expect(d.link?.label).toBe("Review 1 new job");
  });

  it("partial run appends board and AI trouble", () => {
    const d = describeNotification(
      item({ payload: { status: "completed_with_errors", jobsSearched: 38, jobsSaved: 12, belowThreshold: 0, boardsFailed: 1, aiError: "AI down" } }),
    );
    expect(d.detail).toBe(" · 38 scanned · 1 board failed · AI unavailable, rest saved without analysis");
  });

  it("board row: 404 copy, raw reason as hint, repeat count, edit link", () => {
    const d = describeNotification(
      item({
        kind: "board",
        occurrences: 3,
        createdAt: new Date("2026-09-20T09:00:00"),
        payload: { provider: "Greenhouse", token: "northwind", companyName: "Northwind", code: "not_found", reason: "Board 'northwind' returned 404" },
      }),
    );
    expect(d).toEqual({
      icon: "warn",
      title: "Job board unreachable",
      lead: "Greenhouse · Northwind",
      detail: " returned 404 — the company may have moved ATS. Failed on 3 runs since Sep 20.",
      hint: "Board 'northwind' returned 404",
      link: { label: "Edit watchlist", href: "/dashboard/automations/a-1?edit=1" },
    });
  });

  it("board row: http_error names the status instead of the generic copy", () => {
    const d = describeNotification(
      item({
        kind: "board",
        payload: { provider: "Lever", token: "acme", companyName: "Acme", code: "http_error", reason: "Board 'acme' returned 503" },
      }),
    );
    expect(d.detail).toBe(" returned 503.");
  });

  it("error row lists boards when every board failed", () => {
    const d = describeNotification(
      item({
        kind: "error",
        payload: {
          reason: "All 2 boards unreachable",
          jobsSaved: 0,
          boards: [
            { token: "a", companyName: "A", code: "not_found", reason: "x" },
            { token: "b", companyName: "B", code: "timeout", reason: "y" },
          ],
        },
      }),
    );
    expect(d.icon).toBe("fail");
    expect(d.title).toBe("Automation failed");
    expect(d.lead).toBe("0 jobs saved");
    expect(d.detail).toBe(" · “Remote Frontend” stopped: All 2 boards unreachable (A, B).");
    expect(d.link).toEqual({ label: "Open automation", href: "/dashboard/automations/a-1?tab=history" });
  });

  it("classifies errors", () => {
    expect(isErrorNotification(item({ kind: "board" }))).toBe(true);
    expect(isErrorNotification(item({ kind: "error" }))).toBe(true);
    expect(isErrorNotification(item({}))).toBe(false);
  });
});

describe("formatShortAge", () => {
  const now = new Date("2026-09-26T12:00:00");
  it.each([
    [new Date("2026-09-26T11:59:40"), "now"],
    [new Date("2026-09-26T11:56:00"), "4m"],
    [new Date("2026-09-26T11:00:00"), "1h"],
    [new Date("2026-09-25T18:00:00"), "Yesterday"],
    [new Date("2026-09-21T18:00:00"), "Mon"],
    [new Date("2026-09-03T18:00:00"), "Sep 3"],
  ])("%s -> %s", (d, s) => expect(formatShortAge(d, now)).toBe(s));
});

describe("groupByDay", () => {
  it("buckets and drops empty groups", () => {
    const now = new Date("2026-09-26T12:00:00"); // Saturday
    const groups = groupByDay(
      [
        item({ id: "1", occurredAt: new Date("2026-09-26T09:00:00") }),
        item({ id: "2", occurredAt: new Date("2026-09-24T09:00:00") }),
        item({ id: "3", occurredAt: new Date("2026-09-01T09:00:00") }),
      ],
      now,
    );
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ["Today", ["1"]],
      ["Earlier this week", ["2"]],
      ["Earlier", ["3"]],
    ]);
  });
});
