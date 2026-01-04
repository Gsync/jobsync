import { RadialChartComponent } from "../RadialChart";
import { SheetDescription } from "../ui/sheet";
import { JobMatchResponse, JobMatchAnalysis } from "@/models/ai.model";
import type { DeepPartial } from "ai";

const AnalysisSection = ({
  title,
  items,
}: {
  title: string;
  items?: DeepPartial<JobMatchAnalysis>[];
}) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="pt-2">
      <h2 className="font-semibold mb-2">{title}</h2>
      {items.map((analysis, i) => (
        <div key={i}>
          {analysis?.category && (
            <h2 className="font-medium my-1">{analysis.category}</h2>
          )}
          {analysis?.value && analysis.value.length > 0 && (
            <SheetDescription>
              {analysis.value.map((v, j) => v && <li key={j}>{v}</li>)}
            </SheetDescription>
          )}
        </div>
      ))}
    </div>
  );
};

export const AiJobMatchResponseContent = ({
  content,
  isStreaming,
}: {
  content: DeepPartial<JobMatchResponse> | null | undefined;
  isStreaming?: boolean;
}) => {
  if (!content) return null;

  const {
    detailed_analysis,
    matching_score,
    suggestions,
    additional_comments,
  } = content;

  return (
    <>
      {matching_score !== undefined && (
        <div className="pt-2 flex justify-center">
          <RadialChartComponent score={matching_score} />
        </div>
      )}
      <div className={matching_score !== undefined ? "mt-[-50px]" : ""}>
        <AnalysisSection
          title="Detailed Analysis:"
          items={detailed_analysis?.filter(
            (item): item is DeepPartial<JobMatchAnalysis> => Boolean(item)
          )}
        />
      </div>
      <AnalysisSection
        title="Suggestions:"
        items={suggestions?.filter(
          (item): item is DeepPartial<JobMatchAnalysis> => Boolean(item)
        )}
      />
      {additional_comments && additional_comments.length > 0 && (
        <div className="pt-2">
          <h2 className="font-semibold mb-2">Additional Comments:</h2>
          <SheetDescription>
            {additional_comments.map(
              (comment, i) => comment && <li key={i}>{comment}</li>
            )}
          </SheetDescription>
        </div>
      )}
      {isStreaming && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm mt-4 animate-pulse">
          <div className="h-2 w-2 bg-primary rounded-full"></div>
          <span>Streaming response...</span>
        </div>
      )}
    </>
  );
};
