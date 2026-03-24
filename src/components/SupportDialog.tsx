"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import packageJson from "../../package.json";
import { useTranslations } from "@/i18n";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
  const appVersion = packageJson.version;
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const { t } = useTranslations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("common.support")}</DialogTitle>
          <DialogDescription>
            <a
              href="https://github.com/Gsync/jobsync/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              https://github.com/Gsync/jobsync/issues
            </a>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">{t("common.version")}</h3>
            <p className="text-sm text-muted-foreground">v{appVersion}</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">{t("common.copyright")}</h3>
            <p className="text-sm text-muted-foreground">
              &copy; {currentYear} JobSync. {t("common.allRightsReserved")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
