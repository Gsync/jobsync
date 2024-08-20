import { RadialChartComponent } from "../RadialChart";
import { RadialChartSekeleton } from "../RadialChartSekeleton";
import { SheetDescription } from "../ui/sheet";
import { parse } from "best-effort-json-parser";

const Section = ({ title, items }: { title: string; items: string[] }) => (
  <div className="pt-2">
    <h2 className="font-semibold">{title}:</h2>
    <SheetDescription>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </SheetDescription>
  </div>
);

export const AiResumeReviewResponseContent = ({
  content,
}: {
  content: string;
}) => {
  if (content.length <= 1) return null;

  const parsedContent = parse(content);
  const { summary, strengths, weaknesses, suggestions, score } = parsedContent;
  return (
    <>
      <div className="pt-2 flex justify-center">
        {score ? (
          <RadialChartComponent score={score ?? "-"} />
        ) : (
          <RadialChartSekeleton />
        )}
      </div>
      <div className="mt-[-50px]">
        {summary && (
          <div className="pt-2">
            <h2 className="font-semibold">Summary:</h2>
            <SheetDescription>{summary}</SheetDescription>
          </div>
        )}
        {strengths && <Section title="Strengths" items={strengths} />}
        {weaknesses && <Section title="Weaknesses" items={weaknesses} />}
        {suggestions && <Section title="Suggestions" items={suggestions} />}
      </div>
      {/* <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
        <code className="text-white">{parse(content)}</code>
      </pre> */}
    </>
  );
};
