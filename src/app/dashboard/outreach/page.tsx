import { Metadata } from "next";
import { getOutreachList, getJobOptions, getContactOptions } from "@/actions/outreach/outreach.actions";
import OutreachLog from "@/components/outreach/OutreachLog";

export const metadata: Metadata = {
  title: "Outreach | JobSync",
};

export default async function OutreachPage() {
  const [rows, jobs, contacts] = await Promise.all([
    getOutreachList().catch(() => []),
    getJobOptions().catch(() => []),
    getContactOptions().catch(() => []),
  ]);
  return (
    <div className="col-span-3">
      <OutreachLog
        rows={JSON.parse(JSON.stringify(rows ?? []))}
        jobs={JSON.parse(JSON.stringify(jobs ?? []))}
        contacts={JSON.parse(JSON.stringify(contacts ?? []))}
      />
    </div>
  );
}
