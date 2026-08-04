"use client";

import { RadialChartComponent } from "@/components/RadialChartSvg";
import type { ResumeScores } from "@/models/ai.schemas";

// Deliberately a copy of AiResumeReviewResponseContent's ScoresSection rather
// than a shared extraction: the old surface stays byte-identical until it is
// retired, and this is the thing that proves the new one works.
export function AgentReviewScoreCard({ scores }: { scores: ResumeScores }) {
  const items = [
    { label: "Impact", value: scores.impact },
    { label: "Clarity", value: scores.clarity },
    { label: "ATS", value: scores.atsCompatibility },
  ];

  return (
    <div className="rounded-sm border p-3">
      <RadialChartComponent score={scores.overall} />
      <div className="mt-1 grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="font-semibold">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
