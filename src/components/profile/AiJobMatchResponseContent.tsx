import { RadialChartComponent } from "../RadialChart";
import { RadialChartSekeleton } from "../RadialChartSekeleton";
import { SheetDescription } from "../ui/sheet";
import { parse } from "best-effort-json-parser";

interface Analysis {
  category: string;
  value: string[];
}

interface ParsedContent {
  matching_score: number;
  detailed_analysis: Analysis[];
  suggestions: Analysis[];
  additional_comments: string[];
}

export const AiJobMatchResponseContent = ({ content }: { content: string }) => {
  if (content.length <= 1) return null;
  const parsedContent: ParsedContent = parse(content);
  return (
    <>
      <div className="pt-2 flex justify-center">
        {parsedContent.matching_score ? (
          <RadialChartComponent score={parsedContent.matching_score} />
        ) : (
          <RadialChartSekeleton />
        )}
      </div>
      <div className="mt-[-50px]">
        {parsedContent.detailed_analysis && (
          <>
            <h2 className="font-semibold mb-2">Detailed Analysis:</h2>
            {parsedContent.detailed_analysis.map((analysis: any, i: number) => (
              <div key={i}>
                <h2 className="font-medium my-1">
                  {analysis.toString().length > 1 && analysis.category}
                </h2>
                <SheetDescription>
                  {analysis.value &&
                    analysis.value.map((v: string, j: number) => {
                      return <li key={j}>{v}</li>;
                    })}
                </SheetDescription>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="pt-2">
        {parsedContent.suggestions && (
          <>
            <h2 className="font-semibold mb-2">Suggestions: </h2>
            {parsedContent.suggestions.map((analysis: any, i: number) => (
              <div key={i}>
                <h2 className="font-medium my-1">
                  {analysis.toString().length > 1 && analysis.category}
                </h2>
                <SheetDescription>
                  {analysis.value &&
                    analysis.value.map((v: string, j: number) => {
                      return <li key={j}>{v}</li>;
                    })}
                </SheetDescription>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="pt-2">
        {parsedContent.additional_comments && (
          <>
            <h2 className="font-semibold mb-2">Additional Comments: </h2>
            <SheetDescription>
              {parsedContent.additional_comments.map((c: string, i: number) => {
                return <li key={i}>{c}</li>;
              })}
            </SheetDescription>
          </>
        )}
      </div>
    </>
  );
};
