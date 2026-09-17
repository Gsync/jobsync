import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFollowUpsDue, getUpcomingDeadlines } from "@/actions/outreach/outreach.actions";

function fmt(d: Date) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export async function FollowUpsCard() {
  const rows = (await getFollowUpsDue().catch(() => [])) as unknown as {
    id: string;
    followUpDue: Date | null;
    contact?: { name: string } | null;
  }[];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Follow-ups due</CardTitle>
        <Link href="/dashboard/outreach" className="text-xs text-muted-foreground hover:underline">
          Outreach →
        </Link>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing overdue. 🎉</p>
        ) : (
          <ul className="space-y-2">
            {rows.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{r.contact?.name ?? "Contact"}</span>
                <span className="ml-2 shrink-0 font-medium text-red-600">
                  {r.followUpDue ? fmt(r.followUpDue) : "due"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export async function DeadlinesCard() {
  const items = (await getUpcomingDeadlines(8).catch(() => [])) as unknown as {
    kind: string;
    date: Date;
    label: string;
    refId: string;
  }[];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Upcoming deadlines</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deadlines on the radar.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((d) => (
              <li key={`${d.kind}-${d.refId}`} className="flex items-center justify-between text-sm">
                <span className="truncate">
                  <span className="mr-1.5 inline-block rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] uppercase text-neutral-600">
                    {d.kind === "follow-up" ? "follow-up" : "deadline"}
                  </span>
                  {d.label}
                </span>
                <span className="ml-2 shrink-0 font-medium">{fmt(d.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
