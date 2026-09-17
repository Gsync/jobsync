"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SoftPillButton } from "@/components/osui/buttons/soft-pill-button";
import { TextFieldInput } from "@/components/osui/inputs/text-field-input";
import { TextareaFieldInput } from "@/components/osui/inputs/textarea-field-input";
import { SelectFieldInput } from "@/components/osui/inputs/select-field-input";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  logOutreach,
  markOutreachReplied,
  getFollowUpsDue,
} from "@/actions/outreach/outreach.actions";

type Row = {
  id: string;
  subject: string | null;
  paperCited: string | null;
  sentAt: string | null;
  followUpDue: string | null;
  repliedAt: string | null;
  outcome: string | null;
  job: { JobTitle?: { label: string } | null } | null;
  contact: { name: string } | null;
};

type JobOpt = { id: string; JobTitle: { label: string }; Company: { label: string } | null };
type ContactOpt = { id: string; name: string; relationship: string | null };

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function OutreachLog({ rows, jobs, contacts }: { rows: Row[]; jobs: JobOpt[]; contacts: ContactOpt[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDueOnly, setShowDueOnly] = useState(false);
  const [dueIds, setDueIds] = useState<Set<string> | null>(null);
  const [form, setForm] = useState({ jobId: "", contactId: "", subject: "", paperCited: "", body: "" });

  const visible = showDueOnly && dueIds ? rows.filter((r) => dueIds.has(r.id)) : rows;
  const replied = rows.filter((r) => r.repliedAt).length;

  async function toggleDueOnly() {
    if (showDueOnly) {
      setShowDueOnly(false);
      return;
    }
    const due = ((await getFollowUpsDue().catch(() => [])) ?? []) as { id: string }[];
    setDueIds(new Set(due.map((d) => d.id)));
    setShowDueOnly(true);
  }

  async function submit() {
    setSaving(true);
    try {
      const res = (await logOutreach({
        jobId: form.jobId || undefined,
        contactId: form.contactId || undefined,
        subject: form.subject || undefined,
        paperCited: form.paperCited || undefined,
        body: form.body || undefined,
      })) as { success: boolean; message?: string };
      if (!res.success) throw new Error(res.message ?? "Failed to log outreach.");
      toastSuccess("Outreach logged — follow-up set ~12 days out.");
      setFormOpen(false);
      setForm({ jobId: "", contactId: "", subject: "", paperCited: "", body: "" });
      router.refresh();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to log outreach.");
    } finally {
      setSaving(false);
    }
  }

  async function repliedFn(id: string) {
    const res = (await markOutreachReplied(id, "positive")) as { success: boolean; message?: string };
    if (!res.success) toastError(res.message ?? "Update failed.");
    else {
      toastSuccess("Marked as replied.");
      router.refresh();
    }
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-neutral-200 bg-white font-sans">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">Outreach</p>
          <p className="text-xs text-neutral-500">{`${replied} of ${rows.length} replied`}</p>
        </div>
        <div className="flex gap-2">
          <SoftPillButton size="sm" variant={showDueOnly ? "dark" : "light"} onClick={toggleDueOnly}>
            Follow-ups due
          </SoftPillButton>
          <SoftPillButton size="sm" variant="dark" onClick={() => setFormOpen((v) => !v)}>
            Log outreach
          </SoftPillButton>
        </div>
      </div>

      {formOpen && (
        <div className="grid gap-3 border-b border-neutral-100 px-4 py-4 md:grid-cols-2">
          <SelectFieldInput
            label="Application"
            placeholder="Select application (optional)"
            options={jobs.map((j) => ({ value: j.id, label: `${j.JobTitle.label} — ${j.Company?.label ?? ""}` }))}
            value={form.jobId}
            onValueChange={(v) => setForm({ ...form, jobId: v })}
          />
          <SelectFieldInput
            label="Contact"
            placeholder="Select contact (optional)"
            options={contacts.map((c) => ({
              value: c.id,
              label: c.relationship ? `${c.name} — ${c.relationship}` : c.name,
            }))}
            value={form.contactId}
            onValueChange={(v) => setForm({ ...form, contactId: v })}
          />
          <TextFieldInput
            label="Subject"
            placeholder="Prospective PhD — surgical micro-robotics"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
          <TextFieldInput
            label="Paper cited"
            placeholder="Which paper you referenced"
            value={form.paperCited}
            onChange={(e) => setForm({ ...form, paperCited: e.target.value })}
          />
          <div className="md:col-span-2">
            <TextareaFieldInput
              label="Notes / body excerpt"
              value={form.body}
              onChange={(v) => setForm({ ...form, body: v })}
              rows={3}
            />
          </div>
          <div className="md:col-span-2">
            <SoftPillButton size="sm" variant="dark" onClick={submit} disabled={saving}>
              {saving ? "Saving…" : "Save outreach"}
            </SoftPillButton>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-neutral-500">
          No outreach logged yet. Professors you email become rows here with automatic follow-up dates.
        </p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="text-xs text-neutral-500">
              <th className="w-10 px-4 py-2.5" />
              <th className="px-2 py-2.5 font-medium">To</th>
              <th className="hidden px-3 py-2.5 font-medium md:table-cell">Subject</th>
              <th className="px-4 py-2.5 font-medium">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const done = !!r.repliedAt;
              return (
                <tr key={r.id} className="border-t border-neutral-100 transition-colors hover:bg-neutral-50/80">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => !done && repliedFn(r.id)}
                      aria-label={done ? "Replied" : "Mark replied"}
                      title={done ? "Replied" : "Mark replied"}
                      className={cn(
                        "flex size-4 cursor-pointer items-center justify-center rounded border transition-colors",
                        done
                          ? "border-neutral-900 bg-neutral-900"
                          : "border-neutral-300 bg-white hover:border-neutral-400"
                      )}
                    >
                      {done ? <Check className="size-2.5 text-white" strokeWidth={3} /> : null}
                    </button>
                  </td>
                  <td className="px-2 py-3">
                    <span className={cn("font-medium", done ? "text-neutral-400 line-through" : "text-neutral-900")}>
                      {r.contact?.name ?? r.job?.JobTitle?.label ?? "—"}
                    </span>
                    <span className="block text-xs text-neutral-500">
                      {r.paperCited ? `Paper: ${r.paperCited} · ` : ""}Sent {fmt(r.sentAt)}
                      {done ? ` · ${r.outcome ?? "replied"}` : ""}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 text-neutral-600 md:table-cell">
                    <span className="block max-w-55 truncate">{r.subject ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {done ? "—" : <span className="font-medium text-neutral-900">{fmt(r.followUpDue)}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
