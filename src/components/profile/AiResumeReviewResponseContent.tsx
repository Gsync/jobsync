"use client";

import { useMemo } from "react";
import MarkdownIt from "markdown-it";
import { RadialChartComponent } from "../RadialChartSvg";
import { TipTapContentViewer } from "../TipTapContentViewer";
import { ResumeScores } from "@/models/ai.schemas";

// html:false escapes any raw HTML in the model output; TipTapContentViewer
// further strips unrecognized tags, so the rendered review is safe.
const md = new MarkdownIt({ html: false, linkify: false, breaks: true });

const ScoresSection = ({ scores }: { scores?: ResumeScores }) => {
  if (!scores) return null;

  const items = [
    { label: "Impact", value: scores.impact },
    { label: "Clarity", value: scores.clarity },
    { label: "ATS", value: scores.atsCompatibility },
  ];

  return (
    <div className="pt-4">
      {scores.overall !== undefined && (
        <div className="flex justify-center">
          <RadialChartComponent score={scores.overall} />
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 mt-[-10px]">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="font-semibold">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AiResumeReviewResponseContent = ({
  scores,
  body,
  isStreaming,
}: {
  scores?: ResumeScores;
  body?: string;
  isStreaming?: boolean;
}) => {
  const html = useMemo(() => (body ? md.render(body) : ""), [body]);

  if (!scores && !html) return null;

  return (
    <div className="space-y-2">
      <ScoresSection scores={scores} />

      {html && (
        <div className="mt-4 text-sm leading-relaxed [&_p]:mt-2 [&_ul]:mt-2 [&_ol]:mt-2 [&_h2]:mt-4 [&_h2]:font-semibold">
          <TipTapContentViewer content={html} />
        </div>
      )}

      {isStreaming && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm mt-4 animate-pulse">
          <div className="h-2 w-2 bg-primary rounded-full"></div>
          <span>Analyzing resume...</span>
        </div>
      )}
    </div>
  );
};
