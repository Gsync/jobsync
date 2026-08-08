"use client";

import { RadialChartComponent } from "@/components/RadialChartSvg";
import type { ResumeScores } from "@/models/ai.schemas";

// Started as a copy of the retired review sheet's ScoresSection, kept
// separate so that surface could be deleted without touching this one.
// AgentMatchScoreCard is its job-match sibling.
export function AgentReviewScoreCard({
  scores,
  size,
}: {
  scores: ResumeScores;
  size?: number;
}) {
  const items = [
    { label: "Impact", value: scores.impact },
    { label: "Clarity", value: scores.clarity },
    { label: "ATS", value: scores.atsCompatibility },
  ];

  return (
    <div className="rounded-sm border p-3">
      <RadialChartComponent score={scores.overall} size={size} />
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
