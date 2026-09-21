"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, History, Loader2, Upload } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { toastError, toastSuccess } from "@/lib/toast";

interface PreflightResult {
  manifest: {
    formatVersion: number;
    appVersion: string;
    exportedAt: string;
    sourceEmail: string;
    counts: Record<string, number>;
  };
  emailMatches: boolean;
  targetIsEmpty: boolean;
  targetCounts: Record<string, number>;
}

interface SnapshotInfo {
  id: string;
  exportedAt: string;
  appVersion: string;
  counts: Record<string, number>;
  sizeBytes: number;
}

function CountGrid({ counts }: { counts: Record<string, number> }) {
  const rows = Object.entries(counts).filter(([, n]) => n > 0);
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Nothing.</p>;
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
      {rows.map(([model, n]) => (
        <div key={model} className="flex justify-between gap-2">
          <span className="text-muted-foreground">{model}</span>
          <span className="font-medium tabular-nums">{n}</span>
        </div>
      ))}
    </div>
  );
}

export default function DataSettings() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [restoring, setRestoring] = useState<SnapshotInfo | null>(null);

  const loadSnapshots = useCallback(async () => {
    try {
      const res = await fetch("/api/backup/snapshots");
      if (res.ok) setSnapshots((await res.json()) as SnapshotInfo[]);
    } catch {
      // A failed list is not worth a toast — the card just stays empty.
    }
  }, []);

  useEffect(() => {
    void loadSnapshots();
  }, [loadSnapshots]);

  const runRollback = async () => {
    if (!restoring) return;
    const snapshotId = restoring.id;
    setRestoring(null);
    setBusy(true);
    try {
      const res = await fetch("/api/backup/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toastError(json.error, "Rollback failed");
        return;
      }
      toastSuccess(
        "Your data has been rolled back. Reload the page to see it.",
        "Rollback complete",
      );
      await loadSnapshots();
    } catch {
      toastError("Could not reach the server.", "Rollback failed");
    } finally {
      setBusy(false);
    }
  };

  const destroyed = preflight
    ? Object.entries(preflight.targetCounts).filter(([, n]) => n > 0)
    : [];

  const onSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPreflight(null);
    setSelected(file);
    if (!file) return;

    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/backup/import/preflight", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        toastError(json.error, "Could not read that backup");
        return;
      }
      setPreflight(json as PreflightResult);
    } catch {
      toastError("Could not reach the server.", "Could not read that backup");
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    if (!selected) return;
    setConfirming(false);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", selected);
      body.append("confirmWipe", "true");
      const res = await fetch("/api/backup/import", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        toastError(json.error, "Import failed");
        return;
      }
      const total = Object.values(json.counts as Record<string, number>).reduce(
        (sum, n) => sum + n,
        0,
      );
      // Naming the snapshot is the whole point of taking one — a safety net
      // the user does not know exists is not a safety net.
      toastSuccess(
        `Restored ${total} rows and ${json.filesWritten} file(s).${
          json.snapshotPath
            ? " Your previous data was saved as a snapshot you can restore below."
            : ""
        } Re-enter your AI provider API keys, reissue MCP tokens, and reload the page.`,
        "Import complete",
      );
      setPreflight(null);
      setSelected(null);
      if (fileInput.current) fileInput.current.value = "";
      await loadSnapshots();
    } catch {
      toastError("Could not reach the server.", "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Export your data</CardTitle>
          <CardDescription>
            Downloads one zip with every job, resume, task, activity and question on
            this account, plus your uploaded resume files.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The file contains <strong>no API keys</strong>, no MCP tokens and no
            password, so it is safe to store anywhere. It does contain the
            <strong> full text</strong> of every job description, note and resume.
          </p>
          <Button asChild>
            <a href="/api/backup/export" download>
              <Download className="mr-2 h-4 w-4" />
              Download backup
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Import a backup</CardTitle>
          <CardDescription>
            Replaces everything on this account with the contents of the backup.
            Your API keys and MCP tokens are left alone; the agent chat history is
            cleared.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backup-file">Backup file</Label>
            <Input
              id="backup-file"
              ref={fileInput}
              type="file"
              accept=".zip,application/zip"
              onChange={onSelect}
              disabled={busy}
            />
          </div>

          {busy && !preflight && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Reading backup…
            </p>
          )}

          {preflight && (
            <div className="space-y-3 rounded-md border p-4">
              <div className="text-sm">
                <p>
                  Exported{" "}
                  {format(new Date(preflight.manifest.exportedAt), "PPp")} from
                  JobSync {preflight.manifest.appVersion}
                </p>
                <p className="text-muted-foreground">
                  Source account: {preflight.manifest.sourceEmail}
                </p>
              </div>

              {!preflight.emailMatches && (
                <p className="rounded-sm bg-destructive/10 p-2 text-sm font-medium text-destructive">
                  This backup came from a different account
                  ({preflight.manifest.sourceEmail}). Importing it will still wipe
                  the account you are signed in to.
                </p>
              )}

              <div>
                <p className="mb-1 text-sm font-medium">Backup contains</p>
                <CountGrid counts={preflight.manifest.counts} />
              </div>

              <Button
                variant="destructive"
                onClick={() => setConfirming(true)}
                disabled={busy}
              >
                <Upload className="mr-2 h-4 w-4" />
                Replace my data with this backup
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {snapshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Undo an import</CardTitle>
            <CardDescription>
              Every import saves your previous data first. If you imported the
              wrong file, restore the snapshot from just before it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {snapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="flex items-center justify-between gap-4 rounded-md border p-3"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium">
                    {format(new Date(snapshot.exportedAt), "PPp")}
                  </p>
                  <p className="text-muted-foreground">
                    {snapshot.counts.Job ?? 0} jobs, {snapshot.counts.Resume ?? 0}{" "}
                    resumes &middot; {(snapshot.sizeBytes / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => setRestoring(snapshot)}
                >
                  <History className="mr-2 h-4 w-4" />
                  Restore
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog
        open={restoring !== null}
        onOpenChange={(open) => !open && setRestoring(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Roll back to this snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              Everything on this account will be replaced with the data from{" "}
              {restoring && format(new Date(restoring.exportedAt), "PPp")}. A
              snapshot of the current state is saved first, so this is itself
              undoable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runRollback}>
              Roll back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this account&apos;s data?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  This cannot be undone. The following will be permanently deleted
                  and replaced with the backup&apos;s contents:
                </p>
                <ul className="list-inside list-disc text-sm">
                  {destroyed.map(([model, n]) => (
                    <li key={model}>
                      {n} {model.toLowerCase()}
                      {n === 1 ? "" : "s"}
                    </li>
                  ))}
                  {destroyed.length === 0 && <li>nothing — this account is empty</li>}
                </ul>
                {preflight && !preflight.emailMatches && (
                  <p className="font-medium text-destructive">
                    The backup is from a different account.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive-bg text-destructive-foreground hover:bg-destructive-bg/90"
              onClick={runImport}
            >
              Delete everything and import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
