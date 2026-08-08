"use client";

import { RadialChartComponent } from "@/components/RadialChartSvg";
import { Badge } from "@/components/ui/badge";
import type { JobMatchScores } from "@/models/ai.schemas";

const recommendationVariant = (recommendation: string) =>
  recommendation === "strong match"
    ? "default"
    : recommendation === "good match"
      ? "secondary"
      : recommendation === "partial match"
        ? "outline"
        : "destructive";

// A copy of the retired match sheet's score block, kept here so that surface
// could be deleted without touching this one.
export function AgentMatchScoreCard({
  scores,
  size,
}: {
  scores: JobMatchScores;
  size?: number;
}) {
  return (
    <div className="flex flex-col items-center rounded-sm border p-3">
      <RadialChartComponent score={scores.matchScore} size={size} />
      {scores.recommendation && (
        <Badge
          variant={recommendationVariant(scores.recommendation)}
          className="mt-2 capitalize"
        >
          {scores.recommendation}
        </Badge>
      )}
    </div>
  );
}
