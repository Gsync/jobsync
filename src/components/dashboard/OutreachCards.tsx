import Link from "next/link";
import { MinimalAgendaWidget } from "@/components/osui/widgets/minimal-agenda-widget";
import { EventCountdownCard } from "@/components/osui/calender/event-countdown-card";
import { getFollowUpsDue, getUpcomingDeadlines } from "@/actions/outreach/outreach.actions";

function fmt(d: Date | string) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// osui widgets wired to live outreach data.
export async function FollowUpsCard() {
  const rows = (await getFollowUpsDue().catch(() => [])) as unknown as {
    id: string;
    followUpDue: Date | null;
    contact?: { name: string } | null;
  }[];
  return (
    <div className="flex flex-col gap-2">
      <MinimalAgendaWidget
        items={rows.slice(0, 5).map((r) => ({
          time: r.followUpDue ? fmt(r.followUpDue) : "due",
          title: r.contact?.name ?? "Contact",
          done: false,
        }))}
      />
      <Link href="/dashboard/outreach" className="px-1 text-xs text-neutral-500 hover:underline">
        Open outreach →
      </Link>
    </div>
  );
}

export async function DeadlinesCard() {
  const items = (await getUpcomingDeadlines(8).catch(() => [])) as unknown as {
    kind: string;
    date: Date;
    label: string;
    refId: string;
  }[];
  const next = items[0];
  if (!next) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 font-sans">
        <p className="text-sm font-semibold text-neutral-900">Deadlines</p>
        <p className="text-xs text-neutral-500">No deadlines on the radar.</p>
      </div>
    );
  }
  return (
    <EventCountdownCard
      title={next.label}
      targetDate={new Date(next.date).toISOString()}
    />
  );
}
