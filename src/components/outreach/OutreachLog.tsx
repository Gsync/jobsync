"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
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
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDueOnly, setShowDueOnly] = useState(false);
  const [dueIds, setDueIds] = useState<Set<string> | null>(null);
  const [form, setForm] = useState({ jobId: "", contactId: "", subject: "", paperCited: "", body: "" });

  const visible = showDueOnly && dueIds ? rows.filter((r) => dueIds.has(r.id)) : rows;

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
      setOpen(false);
      setForm({ jobId: "", contactId: "", subject: "", paperCited: "", body: "" });
      router.refresh();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to log outreach.");
    } finally {
      setSaving(false);
    }
  }

  async function replied(id: string) {
    const res = (await markOutreachReplied(id, "positive")) as { success: boolean; message?: string };
    if (!res.success) toastError(res.message ?? "Update failed.");
    else {
      toastSuccess("Marked as replied.");
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Outreach log</CardTitle>
        <div className="flex gap-2">
          <Button variant={showDueOnly ? "default" : "outline"} size="sm" onClick={toggleDueOnly}>
            Follow-ups due
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Log outreach</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log cold outreach</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Application</Label>
                  <Select value={form.jobId} onValueChange={(v) => setForm({ ...form, jobId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select application (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.JobTitle.label} — {j.Company?.label ?? ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Contact</Label>
                  <Select value={form.contactId} onValueChange={(v) => setForm({ ...form, contactId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.relationship ? ` — ${c.relationship}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Subject</Label>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Prospective PhD — surgical micro-robotics" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Paper cited</Label>
                  <Input value={form.paperCited} onChange={(e) => setForm({ ...form, paperCited: e.target.value })} placeholder="Which paper you referenced" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Notes / body excerpt</Label>
                  <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submit} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No outreach logged yet. Professors you email become rows here with automatic follow-up dates.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>To</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.contact?.name ?? r.job?.JobTitle?.label ?? "—"}</TableCell>
                  <TableCell className="max-w-55 truncate">{r.subject ?? "—"}</TableCell>
                  <TableCell>{fmt(r.sentAt)}</TableCell>
                  <TableCell>{r.repliedAt ? "—" : fmt(r.followUpDue)}</TableCell>
                  <TableCell>{r.repliedAt ? (r.outcome ?? "replied") : "awaiting reply"}</TableCell>
                  <TableCell>
                    {!r.repliedAt && (
                      <Button variant="outline" size="sm" onClick={() => replied(r.id)}>
                        Mark replied
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
