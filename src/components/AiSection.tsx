"use client";
import { Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import Loading from "./Loading";
import { useRef, useState } from "react";
import { toast } from "./ui/use-toast";
import { Resume } from "@/models/profile.model";
import { ResumeReviewResponse } from "@/models/ai.model";
import { AiResponseContent } from "./AiResponseContent";

interface AiSectionProps {
  resume: Resume;
}

const AiSection = ({ resume }: AiSectionProps) => {
  const [aIContent, setAIContent] = useState<ResumeReviewResponse | any>("");
  const [aISectionOpen, setAiSectionOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
    null
  );

  const abortControllerRef = useRef<AbortController | null>(null);

  const getResumeReview = async () => {
    try {
      if (!resume || resume.ResumeSections?.length === 0) {
        throw new Error("Resume content is required");
      }
      setAiSectionOpen(true);
      setLoading(true);
      setAIContent("");
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resume),
        signal: abortController.signal,
      });

      if (!response.body) {
        setLoading(false);
        throw new Error("No response body");
      }

      if (!response.ok) {
        setLoading(false);
        throw new Error(response.statusText);
      }

      const reader = response.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let done = false;
      setLoading(false);

      while (!done && !abortController.signal.aborted) {
        const { value, done: doneReading } = await reader.read();

        done = doneReading;
        const chunk = decoder.decode(value, { stream: !done });
        const parsedChunk = JSON.parse(JSON.stringify(chunk));
        setAIContent((prev: any) => prev + parsedChunk);
      }
      reader.releaseLock();
    } catch (error) {
      const message = "Error fetching resume review";
      const description = error instanceof Error ? error.message : message;
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Error!",
        description,
      });
    }
  };

  const triggerChange = async (openState: boolean) => {
    setAiSectionOpen(openState);
    if (openState === false) {
      abortStream();
    }
  };

  const abortStream = async () => {
    abortControllerRef.current?.abort();
    if (readerRef.current && !readerRef?.current.closed) {
      await readerRef?.current.cancel();
      console.log("closed reader", aIContent);
    }
  };

  return (
    <Sheet open={aISectionOpen} onOpenChange={triggerChange}>
      <div className="ml-2">
        <SheetTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 cursor-pointer"
            onClick={getResumeReview}
            disabled={loading}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Review
            </span>
          </Button>
        </SheetTrigger>
      </div>
      {
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
                <AiResponseContent content={aIContent} />
              )}
            </SheetHeader>
          </SheetContent>
        </SheetPortal>
      }
    </Sheet>
  );
};

export default AiSection;
