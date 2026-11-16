"use client";
import { AlertTriangle, Loader, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../../ui/button";
import { Card, CardHeader } from "../../ui/card";
import type { PendingCard } from "./pendingCards";
import { PendingCardRow } from "./PendingCardRow";

export function ImportReviewBanner({
  pendingCards,
  isStructuring,
  importTruncated,
  unrecognizedSections,
  onAccept,
  onDiscard,
  onDiscardImport,
}: {
  pendingCards: PendingCard[];
  isStructuring: boolean;
  importTruncated: boolean;
  unrecognizedSections: string[];
  onAccept: (id: string) => void;
  onDiscard: (id: string) => void;
  onDiscardImport: () => void;
}) {
  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p
              className={cn(
                "font-medium flex items-center",
                isStructuring ? "text-base gap-3" : "text-sm gap-2",
              )}
            >
              {isStructuring ? (
                <>
                  <Loader className="h-8 w-8 shrink-0 text-blue-500 animate-spin" />
                  Structuring your document… you can review and accept items
                  once it finishes.
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  We pre-filled this from your document. Review each item
                  and accept the ones you want.
                  {importTruncated &&
                    " Only the first 5 pages were imported."}
                </>
              )}
            </p>
            {unrecognizedSections.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Some sections couldn&apos;t be imported (
                {unrecognizedSections.join(", ")}) — the resume model
                doesn&apos;t support these yet.
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={onDiscardImport}
          >
            Discard import
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {pendingCards.map((pending) => (
            <PendingCardRow
              key={pending.id}
              pending={pending}
              onAccept={onAccept}
              onDiscard={onDiscard}
              locked={isStructuring}
            />
          ))}
        </div>
      </CardHeader>
    </Card>
  );
}
