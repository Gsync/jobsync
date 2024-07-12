"use client";
import { Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
} from "./ui/sheet";
import Loading from "./Loading";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "./ui/use-toast";
import { Resume } from "@/models/profile.model";
import { ResumeReviewResponse } from "@/models/ai.model";
import { Editor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface AiSectionProps {
  resume: Resume;
}

const AiSection = ({ resume }: AiSectionProps) => {
  const [aIContent, setAIContent] = useState<ResumeReviewResponse | any>({
    summary: "",
    strengths: [],
    weaknesses: [],
    suggestions: [],
    score: 0,
  });
  const [aISectionOpen, setAiSectionOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  useEffect(() => {}, []);

  const getResumeReview = async () => {
    try {
      if (!resume || resume.ResumeSections?.length === 0) {
        throw new Error("Resume content is required");
      }
      setAiSectionOpen(true);
      setLoading(true);
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resume),
      });

      if (!response.body) {
        setLoading(false);
        throw new Error("No response body");
      }

      if (!response.ok) {
        setLoading(false);
        throw new Error(response.statusText);
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      setLoading(false);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value, { stream: !done });
        setAIContent((prev: any) => prev + chunk);
      }
    } catch (error) {
      const message = "Error fetching resume review";
      console.error(message, error);
      const description = error instanceof Error ? error.message : message;
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Error!",
        description,
      });
    }
  };

  return (
    <Sheet open={aISectionOpen} onOpenChange={setAiSectionOpen}>
      <div className="ml-2">
        <Button
          size="sm"
          className="h-8 gap-1 cursor-pointer"
          onClick={getResumeReview}
          disabled={loading}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Review
          </span>
        </Button>
      </div>
      <SheetPortal>
        <SheetContent className="overflow-y-scroll">
          <SheetHeader>
            <SheetTitle>AI Review</SheetTitle>
            {loading ? (
              <div className="flex items-center flex-col">
                <Loading />
                <div>Loading...</div>
              </div>
            ) : (
              <>
                <div className="pt-2">
                  <h2>Score: {aIContent.score}</h2>
                </div>
                <div className="pt-2">
                  <h2 className="font-semibold">Summary: </h2>
                  <SheetDescription>
                    <div>{aIContent?.summary}</div>
                  </SheetDescription>
                </div>
                <div className="pt-2">
                  <h2 className="font-semibold">Strengths: </h2>
                  <SheetDescription>
                    {/* <div>
                      {aIContent?.strengths.map((s, i) => {
                        return <li key={i}>{s}</li>;
                      })}
                    </div> */}
                  </SheetDescription>
                </div>
                <div className="pt-2">
                  <h2 className="font-semibold">Weaknesses: </h2>
                  <SheetDescription>
                    {/* <div>
                      {aIContent?.weaknesses.map((w, i) => {
                        return <li key={i}>{w}</li>;
                      })}
                    </div> */}
                  </SheetDescription>
                </div>
                <div className="pt-2">
                  <h2 className="font-semibold">Suggestions: </h2>
                  <SheetDescription>
                    {/* <div>
                      {aIContent?.suggestions.map((s, i) => {
                        return <li key={i}>{s}</li>;
                      })}
                    </div> */}
                  </SheetDescription>
                </div>
                <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
                  <code className="text-white">
                    {/* {JSON.stringify(data, null, 2)} */}
                    {aIContent}
                  </code>
                </pre>
              </>
            )}
          </SheetHeader>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
};

export default AiSection;
