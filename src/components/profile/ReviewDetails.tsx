"use client";

import { useMemo, useState } from "react";
import MarkdownIt from "markdown-it";
import { format } from "date-fns";
import { ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TipTapContentViewer } from "@/components/TipTapContentViewer";
import type { ResumeReviewData } from "@/models/ai.schemas";

// html:false escapes any raw HTML in the model output; TipTapContentViewer
// further strips unrecognized tags, so the rendered review is safe.
const md = new MarkdownIt({ html: false, linkify: false, breaks: true });

interface ReviewDetailsProps {
  reviewData: ResumeReviewData | null;
}

export function ReviewDetails({ reviewData }: ReviewDetailsProps) {
  const [expanded, setExpanded] = useState(false);
  const html = useMemo(
    () => (reviewData?.body ? md.render(reviewData.body) : ""),
    [reviewData?.body],
  );

  if (!reviewData) return null;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-lg font-semibold">
            Overall {reviewData.overall}
          </span>
          <span className="text-sm text-muted-foreground">
            Impact {reviewData.impact} · Clarity {reviewData.clarity} · ATS{" "}
            {reviewData.atsCompatibility}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {reviewData.reviewedAt ? (
            <span>
              Reviewed on{" "}
              {format(
                new Date(reviewData.reviewedAt),
                "MMM d, yyyy 'at' h:mm a",
              )}
            </span>
          ) : null}
          {reviewData.provider === "mcp"
            ? reviewData.model && (
                <Badge className="gap-1 bg-violet-500 dark:bg-violet-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  via {reviewData.model}
                </Badge>
              )
            : reviewData.provider
              ? `using ${reviewData.provider}${reviewData.model ? ` / ${reviewData.model}` : ""}`
              : null}
        </div>
      </div>

      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs">
          {expanded ? "Hide full review" : "Show full review"}
          <ChevronDown
            className={`ml-1 h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        {html && (
          <div className="mt-3 text-sm leading-relaxed [&_p]:mt-2 [&_ul]:mt-2 [&_ol]:mt-2 [&_h2]:mt-4 [&_h2]:font-semibold">
            <TipTapContentViewer content={html} />
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
