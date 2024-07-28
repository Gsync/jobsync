import { SheetDescription } from "../ui/sheet";
import { parse } from "best-effort-json-parser";

export const AiResumeReviewResponseContent = ({
  content,
}: {
  content: any;
}) => {
  return (
    <>
      <div className="pt-2">
        {content.length > 1 && (
          <>
            <h2 className="font-semibold">Summary:</h2>
            <SheetDescription>{parse(content).summary}</SheetDescription>
          </>
        )}
      </div>
      <div className="pt-2">
        {content.length > 1 && parse(content).strengths && (
          <>
            <h2 className="font-semibold">Strengths:</h2>
            <SheetDescription>
              {parse(content).strengths.map((s: string, i: number) => {
                return <li key={i}>{s}</li>;
              })}
            </SheetDescription>
          </>
        )}
      </div>
      <div className="pt-2">
        {content.length > 1 && parse(content).weaknesses && (
          <>
            <h2 className="font-semibold">Weaknesses: </h2>
            <SheetDescription>
              {parse(content).weaknesses.map((w: string, i: number) => {
                return <li key={i}>{w}</li>;
              })}
            </SheetDescription>
          </>
        )}
      </div>
      <div className="pt-2">
        {content.length > 1 && parse(content).suggestions && (
          <>
            <h2 className="font-semibold">Suggestions: </h2>
            <SheetDescription>
              {parse(content).suggestions.map((s: string, i: number) => {
                return <li key={i}>{s}</li>;
              })}
            </SheetDescription>
          </>
        )}
        <div className="pt-2">
          {content.length > 1 && parse(content).score && (
            <h2>Review Score: {parse(content).score}</h2>
          )}
        </div>
      </div>
      {/* <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
     <code className="text-white">
       {JSON.stringify(aIContent, null, 2)}
       {aIContent}
     </code>
   </pre> */}
    </>
  );
};
