import { RadialChartComponent } from "../RadialChart";
import { SheetDescription } from "../ui/sheet";
import { parse } from "best-effort-json-parser";

export const AiJobMatchResponseContent = ({ content }: { content: any }) => {
  return (
    <>
      <div className="pt-2">
        {content.length > 1 && parse(content).matching_score && (
          <RadialChartComponent score={parse(content).matching_score} />
        )}
      </div>
      <div>
        {content.length > 1 && parse(content).detailed_analysis && (
          <>
            <h2 className="font-semibold">Detailed Analysis:</h2>
            {parse(content).detailed_analysis.map(
              (analysis: any, i: number) => (
                <div key={i}>
                  <h2 className="text-white font-medium">
                    {analysis.toString().length > 1 && analysis.category}
                  </h2>
                  <SheetDescription>
                    {analysis.value &&
                      analysis.value.map((v: string, j: number) => {
                        return <li key={j}>{v}</li>;
                      })}
                  </SheetDescription>
                </div>
              )
            )}
          </>
        )}
      </div>
      <div className="pt-2">
        {content.length > 1 && parse(content).suggestions && (
          <>
            <h2 className="font-semibold">Suggestions: </h2>
            {parse(content).suggestions.map((analysis: any, i: number) => (
              <div key={i}>
                <h2 className="text-white font-medium">
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
        {content.length > 1 && parse(content).additional_comments && (
          <>
            <h2 className="font-semibold">Additional Comments: </h2>
            <SheetDescription>
              {parse(content).additional_comments.map(
                (c: string, i: number) => {
                  return <li key={i}>{c}</li>;
                }
              )}
            </SheetDescription>
          </>
        )}
      </div>
    </>
  );
};
