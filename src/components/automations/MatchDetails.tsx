"use client";

import { useMemo } from "react";
import Link from "next/link";
import MarkdownIt from "markdown-it";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { TipTapContentViewer } from "@/components/TipTapContentViewer";
import type { JobMatchData } from "@/models/ai.schemas";

// html:false escapes any raw HTML in the model output; TipTapContentViewer
// further strips unrecognized tags, so the rendered analysis is safe.
const md = new MarkdownIt({ html: false, linkify: false, breaks: true });

// Legacy matches saved before the markdown refactor have a structured `summary`
// instead of a `body`. Show what we can rather than rendering blank.
interface LegacyMatchData {
  summary?: string;
}

interface MatchDetailsProps {
  matchData: (JobMatchData & LegacyMatchData) | null;
  discoveredAt?: Date;
}

export function MatchDetails({ matchData, discoveredAt }: MatchDetailsProps) {
  const html = useMemo(
    () => (matchData?.body ? md.render(matchData.body) : ""),
    [matchData?.body],
  );

  if (!matchData) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {matchData.recommendation && (
          <Badge variant="outline" className="capitalize">
            {matchData.recommendation}
          </Badge>
        )}
        {matchData.descriptionCompleteness &&
          matchData.descriptionCompleteness !== "full" && (
            <Badge
              variant="secondary"
              title="Scored from an incomplete job description — re-run the match after adding the full posting."
            >
              Provisional score
            </Badge>
          )}
      </div>

      {html ? (
        <div className="text-sm leading-relaxed [&_p]:mt-2 [&_ul]:mt-2 [&_ol]:mt-2 [&_h2]:mt-4 [&_h2]:font-semibold">
          <TipTapContentViewer content={html} />
        </div>
      ) : matchData.summary ? (
        <div className="space-y-2">
          <p className="text-sm">{matchData.summary}</p>
          <p className="text-xs text-muted-foreground italic">
            This match was saved before the latest update. Re-run the match for
            the full breakdown.
          </p>
        </div>
      ) : null}

      <div className="text-xs text-muted-foreground space-y-1">
        {matchData.resumeTitle && (
          <p>
            Matched with resume:{" "}
            {matchData.resumeId ? (
              <Link
                href={`/dashboard/profile/resume/${matchData.resumeId}`}
                className="font-medium underline hover:text-foreground"
              >
                {matchData.resumeTitle}
              </Link>
            ) : (
              <span className="font-medium">{matchData.resumeTitle}</span>
            )}
          </p>
        )}
        {matchData.provider && (
          <p>
            Model:{" "}
            <span className="font-medium">
              {matchData.provider}
              {matchData.model ? ` / ${matchData.model}` : ""}
            </span>
          </p>
        )}
        <p>
          {matchData.matchedAt
            ? `Matched on ${format(new Date(matchData.matchedAt), "MMM d, yyyy 'at' h:mm a")}`
            : discoveredAt
              ? `Discovered on ${format(new Date(discoveredAt), "MMM d, yyyy 'at' h:mm a")}`
              : null}
        </p>
      </div>
    </div>
  );
}
