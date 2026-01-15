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
import { useCollaborativeAnalysis } from "@/hooks/useCollaborativeAnalysis";
import { MultiAgentProgress } from "./MultiAgentProgress";

interface AiSectionProps {
  resume: Resume;
}

const AiResumeReviewSection = ({ resume }: AiSectionProps) => {
  const [aISectionOpen, setAiSectionOpen] = useState(false);
  const [runningModelName, setRunningModelName] = useState<string>("");
  const [runningModelError, setRunningModelError] = useState<string>("");
  const [useCollaboration, setUseCollaboration] = useState<boolean>(false);

  const selectedModel: AiModel = getFromLocalStorage(
    "aiSettings",
    defaultModel
  );

  // Standard single-agent mode
  const {
    object,
    submit,
    isLoading: singleAgentLoading,
    stop,
  } = useObject({
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

  // Multi-agent collaborative mode
  const {
    isLoading: multiAgentLoading,
    result: collaborativeResult,
    error: collaborativeError,
    start: startCollaborative,
    stop: stopCollaborative,
  } = useCollaborativeAnalysis<ResumeReviewResponse>("resume-review");

  const isLoading = useCollaboration ? multiAgentLoading : singleAgentLoading;
  const displayObject = useCollaboration ? collaborativeResult : object;

  const getResumeReview = () => {
    if (!resume || resume.ResumeSections?.length === 0) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Resume content is required",
      });
      return;
    }

    if (useCollaboration) {
      startCollaborative({ selectedModel, resume });
    } else {
      submit({ selectedModel, resume });
    }
  };

  const triggerSheetChange = async (openState: boolean) => {
    setAiSectionOpen(openState);
    if (!openState && isLoading) {
      if (useCollaboration) {
        stopCollaborative();
      } else {
        stop();
      }
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
  const hasContent =
    displayObject &&
    (displayObject.score !== undefined || displayObject.summary);

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

          {/* Multi-Agent Mode Toggle */}
          <div className="mt-4 p-3 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="collaboration-mode-review"
                  className="text-sm font-medium"
                >
                  Multi-Agent Collaboration
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-semibold mb-1">
                        Phase 2: Consolidated Multi-Agent System
                      </p>
                      <p className="text-xs mb-2">
                        Uses 2 specialized AI agents working together:
                      </p>
                      <ul className="text-xs space-y-1">
                        <li>• Analysis Agent (data, keywords, scoring)</li>
                        <li>• Feedback Agent (actionable recommendations)</li>
                      </ul>
                      <p className="text-xs mt-2 text-green-500">
                        ✨ 40-50% faster, same accuracy
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <input
                id="collaboration-mode-review"
                type="checkbox"
                checked={useCollaboration}
                onChange={(e) => setUseCollaboration(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </div>
            {useCollaboration && (
              <p className="text-xs text-muted-foreground mt-2">
                🤖 2 AI agents will analyze your resume together
              </p>
            )}
          </div>

          {/* Multi-Agent Progress Indicator */}
          <MultiAgentProgress isActive={useCollaboration && isLoading} />

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
              <div className="mt-2">
                {useCollaboration
                  ? "2 agents analyzing..."
                  : "Analyzing resume..."}
              </div>
            </div>
          ) : (
            <AiResumeReviewResponseContent
              content={displayObject}
              isStreaming={isLoading}
            />
          )}
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
};

export default AiResumeReviewSection;
