import { RadialChartComponent } from "../RadialChart";
import { SheetDescription } from "../ui/sheet";
import { ResumeReviewResponse } from "@/models/ai.model";
import type { DeepPartial } from "ai";

const Section = ({
  title,
  items,
}: {
  title: string;
  items?: (string | undefined)[];
}) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="pt-2">
      <h2 className="font-semibold">{title}:</h2>
      <SheetDescription>
        {items.map((item, index) => item && <li key={index}>{item}</li>)}
      </SheetDescription>
    </div>
  );
};

export const AiResumeReviewResponseContent = ({
  content,
  isStreaming,
}: {
  content: DeepPartial<ResumeReviewResponse> | null | undefined;
  isStreaming?: boolean;
}) => {
  if (!content) return null;

  const { summary, strengths, weaknesses, suggestions, score } = content;

  return (
    <>
      {score !== undefined && (
        <div className="pt-2 flex justify-center">
          <RadialChartComponent score={score} />
        </div>
      )}
      <div className={score !== undefined ? "mt-[-50px]" : ""}>
        {summary && (
          <div className="pt-2">
            <h2 className="font-semibold">Summary:</h2>
            <SheetDescription>{summary}</SheetDescription>
          </div>
        )}
        <Section title="Strengths" items={strengths} />
        <Section title="Weaknesses" items={weaknesses} />
        <Section title="Suggestions" items={suggestions} />
      </div>
      {isStreaming && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm mt-4 animate-pulse">
          <div className="h-2 w-2 bg-primary rounded-full"></div>
          <span>Streaming response...</span>
        </div>
      )}
    </>
  );
};
