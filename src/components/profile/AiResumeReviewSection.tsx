"use client";
import { Info, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import Loading from "../Loading";
import { useRef, useState } from "react";
import { toast } from "../ui/use-toast";
import { Resume } from "@/models/profile.model";
import { AiModel, defaultModel, ResumeReviewResponse } from "@/models/ai.model";
import { AiResumeReviewResponseContent } from "./AiResumeReviewResponseContent";
import { getFromLocalStorage } from "@/utils/localstorage.utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface AiSectionProps {
  resume: Resume;
}

const AiResumeReviewSection = ({ resume }: AiSectionProps) => {
  const [aIContent, setAIContent] = useState<ResumeReviewResponse | any>("");
  const [aISectionOpen, setAiSectionOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const selectedModel: AiModel = getFromLocalStorage(
    "aiSettings",
    defaultModel
  );
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
    null
  );

  const abortControllerRef = useRef<AbortController | null>(null);

  const getResumeReview = async () => {
    try {
      if (!resume || resume.ResumeSections?.length === 0) {
        throw new Error("Resume content is required");
      }
      setLoading(true);
      setAIContent("");
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const response = await fetch("/api/ai/resume/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedModel, resume }),
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
      setIsStreaming(true);
      while (!done && !abortController.signal.aborted) {
        const { value, done: doneReading } = await reader.read();

        done = doneReading;
        const chunk = decoder.decode(value, { stream: !done });
        const parsedChunk = JSON.parse(JSON.stringify(chunk));
        setAIContent((prev: any) => prev + parsedChunk);
      }
      reader.releaseLock();
      setIsStreaming(false);
    } catch (error) {
      const message = "Error fetching resume review";
      const description = error instanceof Error ? error.message : message;
      setLoading(false);
      setIsStreaming(false);
      toast({
        variant: "destructive",
        title: "Error!",
        description,
      });
    }
  };

  const triggerSheetChange = async (openState: boolean) => {
    setAiSectionOpen(openState);
    if (openState === false) {
      abortStream();
    }
  };

  const abortStream = async () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    if (readerRef.current && !readerRef?.current.closed) {
      await readerRef?.current.cancel();
    }
  };

  return (
    <Sheet open={aISectionOpen} onOpenChange={triggerSheetChange}>
      <div className="ml-2">
        <SheetTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 cursor-pointer"
            onClick={() => triggerSheetChange(true)}
            disabled={loading || resume.ResumeSections?.length! < 2}
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
              <SheetTitle className="flex flex-row items-center">
                AI Review ({selectedModel.provider})
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground mx-1" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{`Provider: ${selectedModel.provider}`}</p>
                      <p>{`Model: ${selectedModel.model}`}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 cursor-pointer"
                onClick={getResumeReview}
                disabled={loading || isStreaming}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Generate AI Review
                </span>
              </Button>
            </div>
            {loading ? (
              <div className="flex items-center flex-col">
                <Loading />
                <div>Loading...</div>
              </div>
            ) : (
              <AiResumeReviewResponseContent content={aIContent} />
            )}
          </SheetContent>
        </SheetPortal>
      }
    </Sheet>
  );
};

export default AiResumeReviewSection;
