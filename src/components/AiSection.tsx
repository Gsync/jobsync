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
import { useCallback, useEffect, useState } from "react";
import { toast } from "./ui/use-toast";

interface AiSectionProps {
  getAiResponse: () => void;
}

const AiSection = () => {
  const [aIContent, setAIContent] = useState("");
  const [aISectionOpen, setAiSectionOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let isStreaming = true;
  const terminateStream = useCallback(() => {
    if (reader) {
      console.log("Stream terminated");
      isStreaming = false;
      reader
        .cancel()
        .catch((error) => console.error("Stream cancel error:", error));
    }
  }, [reader]);
  useEffect(() => {
    if (!aISectionOpen) {
      setAIContent("");
      terminateStream();
    }
  }, [aISectionOpen, terminateStream]);

  const getResumeReview = async () => {
    try {
      setAiSectionOpen(true);
      setLoading(true);

      const response = await fetch("/api/ai", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        // body: JSON.stringify({ text: resume?.title }),
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

      while (!done && isStreaming) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value, { stream: !done });
        setAIContent((prev) => prev + chunk);
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
            <SheetDescription>
              {loading ? (
                <div className="flex items-center flex-col">
                  <Loading />
                  <div>Loading...</div>
                </div>
              ) : (
                aIContent
              )}
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
};

export default AiSection;
