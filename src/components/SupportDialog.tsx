"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Star } from "lucide-react";
import { AppVersionInfo } from "@/models/version.model";
import packageJson from "../../package.json";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version?: AppVersionInfo | null;
}

export function SupportDialog({
  open,
  onOpenChange,
  version,
}: SupportDialogProps) {
  const appVersion = packageJson.version;
  const currentYear = new Date().getFullYear();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Support</DialogTitle>
          <DialogDescription className="space-y-1">
            <a
              href="https://github.com/Gsync/jobsync/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-primary hover:underline"
            >
              https://github.com/Gsync/jobsync/issues
            </a>
            <a
              href="https://github.com/Gsync/jobsync/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-primary hover:underline"
            >
              https://github.com/Gsync/jobsync/discussions
            </a>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <a
            href="https://github.com/Gsync/jobsync"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 transition-colors hover:bg-amber-500/20"
          >
            <Star className="h-5 w-5 shrink-0 fill-amber-400 text-amber-500 transition-transform group-hover:scale-110" />
            <span className="space-y-0.5">
              <span className="block text-sm font-semibold">
                Is JobSync helping your search? Give it a star
              </span>
              <span className="block text-xs text-muted-foreground">
                It takes one click and helps other job seekers find it.
              </span>
            </span>
          </a>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Version</h3>
            <p className="text-sm text-muted-foreground">v{appVersion}</p>
            {version?.updateAvailable && (
              <p className="text-sm">
                <a
                  href={version.releaseUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {version.latest} is available
                </a>
              </p>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Copyright</h3>
            <p className="text-sm text-muted-foreground">
              © {currentYear} JobSync. All rights reserved.
            </p>
            <a
              href="https://jobsync.ca/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              https://jobsync.ca/
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
