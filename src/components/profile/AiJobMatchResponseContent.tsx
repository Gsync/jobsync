"use client";

import { useMemo } from "react";
import MarkdownIt from "markdown-it";
import { RadialChartComponent } from "../RadialChartSvg";
import { TipTapContentViewer } from "../TipTapContentViewer";
import { Badge } from "../ui/badge";
import { JobMatchScores } from "@/models/ai.schemas";

// html:false escapes any raw HTML in the model output; TipTapContentViewer
// further strips unrecognized tags, so the rendered analysis is safe.
const md = new MarkdownIt({ html: false, linkify: false, breaks: true });

const recommendationVariant = (recommendation: string) =>
  recommendation === "strong match"
    ? "default"
    : recommendation === "good match"
      ? "secondary"
      : recommendation === "partial match"
        ? "outline"
        : "destructive";

export const AiJobMatchResponseContent = ({
  scores,
  body,
  isStreaming,
}: {
  scores?: JobMatchScores;
  body?: string;
  isStreaming?: boolean;
}) => {
  const html = useMemo(() => (body ? md.render(body) : ""), [body]);

  if (!scores && !html) return null;

  return (
    <div className="space-y-2">
      {scores?.matchScore !== undefined && (
        <div className="pt-2 flex flex-col items-center">
          <RadialChartComponent score={scores.matchScore} />
          {scores.recommendation && (
            <Badge
              variant={recommendationVariant(scores.recommendation)}
              className="mt-2 capitalize"
            >
              {scores.recommendation}
            </Badge>
          )}
        </div>
      )}

      {html && (
        <div className="mt-4 text-sm leading-relaxed [&_p]:mt-2 [&_ul]:mt-2 [&_ol]:mt-2 [&_h2]:mt-4 [&_h2]:font-semibold">
          <TipTapContentViewer content={html} />
        </div>
      )}

      {isStreaming && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm mt-4 animate-pulse">
          <div className="h-2 w-2 bg-primary rounded-full"></div>
          <span>Analyzing job match...</span>
        </div>
      )}
    </div>
  );
};
