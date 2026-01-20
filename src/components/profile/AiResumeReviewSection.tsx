"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { Info, Sparkles, CheckCircle, XCircle } from "lucide-react";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import Loading from "../Loading";
import { useState } from "react";
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
import { checkIfModelIsRunning } from "@/utils/ai.utils";
import { ResumeReviewSchema } from "@/models/ai.schemas";

interface AiSectionProps {
  resume: Resume;
}

const AiResumeReviewSection = ({ resume }: AiSectionProps) => {
  const [aISectionOpen, setAiSectionOpen] = useState(false);
  const [runningModelName, setRunningModelName] = useState<string>("");
  const [runningModelError, setRunningModelError] = useState<string>("");

  const selectedModel: AiModel = getFromLocalStorage(
    "aiSettings",
    defaultModel
  );

  // Standard single-agent mode
  const { object, submit, isLoading, stop } = useObject({
    api: "/api/ai/resume/review",
    schema: ResumeReviewSchema,
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Error!",
        description: err.message || "Failed to get AI review",
      });
    },
  });

  const getResumeReview = () => {
    if (!resume || resume.ResumeSections?.length === 0) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Resume content is required",
      });
      return;
    }

    submit({ selectedModel, resume });
  };

  const triggerSheetChange = async (openState: boolean) => {
    setAiSectionOpen(openState);
    if (!openState && isLoading) {
      stop();
    } else if (openState && selectedModel.provider === "ollama") {
      await checkModelStatus();
    }
  };

  const checkModelStatus = async () => {
    setRunningModelName("");
    setRunningModelError("");
    const result = await checkIfModelIsRunning(
      selectedModel.model,
      selectedModel.provider
    );
    if (result.isRunning && result.runningModelName) {
      setRunningModelName(result.runningModelName);
    } else if (result.error) {
      setRunningModelError(result.error);
    }
  };

  // Check if we have any content to show
  const hasContent = object && (object.scores?.overall !== undefined || object.summary);

  return (
    <Sheet open={aISectionOpen} onOpenChange={triggerSheetChange}>
      <div className="ml-2">
        <SheetTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 cursor-pointer"
            onClick={() => triggerSheetChange(true)}
            disabled={isLoading || resume.ResumeSections?.length! < 2}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Review
            </span>
          </Button>
        </SheetTrigger>
      </div>
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

          {selectedModel.provider === "ollama" && (
            <>
              {runningModelName && (
                <div className="flex items-center gap-1 text-green-600 text-sm mt-4">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{runningModelName} is running</span>
                </div>
              )}
              {runningModelError && (
                <div className="flex items-center gap-1 text-red-600 text-sm mt-4">
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{runningModelError}</span>
                </div>
              )}
            </>
          )}

          <div className="mt-4">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 cursor-pointer"
              onClick={getResumeReview}
              disabled={
                isLoading ||
                (selectedModel.provider === "ollama" && !runningModelName)
              }
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Generate AI Review
              </span>
            </Button>
          </div>

          {isLoading && !hasContent ? (
            <div className="flex items-center flex-col mt-4">
              <Loading />
              <div className="mt-2">Analyzing resume...</div>
            </div>
          ) : (
            <AiResumeReviewResponseContent
              content={object}
              isStreaming={isLoading}
            />
          )}
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
};

export default AiResumeReviewSection;
