import Link from "next/link";
import { Card } from "../../ui/card";
import { JobTabEmptyState } from "./JobTabEmptyState";
import { Mails } from "lucide-react";

export type JobOutreachRow = {
  id: string;
  subject: string | null;
  paperCited: string | null;
  sentAt: Date | string | null;
  followUpDue: Date | string | null;
  repliedAt: Date | string | null;
  outcome: string | null;
  contact?: { name: string } | null;
};

function fmt(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function JobOutreachTab({ outreach }: { outreach: JobOutreachRow[] }) {
  if (!outreach || outreach.length === 0) {
    return (
      <Card className="p-6">
        <JobTabEmptyState
          icon={Mails}
          title="No outreach yet"
          description="Log the cold emails you send for this application — follow-ups are scheduled automatically."
          actionLabel="Open outreach log"
          onAction={() => (window.location.href = "/dashboard/outreach")}
        />
      </Card>
    );
  }
  return (
    <Card className="p-6">
      <ul className="space-y-3">
        {outreach.map((o) => (
          <li key={o.id} className="rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{o.contact?.name ?? o.subject ?? "Outreach"}</span>
              <span className="shrink-0 text-muted-foreground">
                {o.repliedAt ? `replied (${o.outcome ?? "—"})` : `follow up ${fmt(o.followUpDue)}`}
              </span>
            </div>
            {o.paperCited && <p className="mt-1 text-muted-foreground">Paper: {o.paperCited}</p>}
            <p className="mt-1 text-xs text-muted-foreground">Sent {fmt(o.sentAt)}</p>
          </li>
        ))}
      </ul>
      <Link href="/dashboard/outreach" className="mt-3 inline-block text-sm text-muted-foreground hover:underline">
        Open outreach log →
      </Link>
    </Card>
  );
}
