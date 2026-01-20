"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { getResumeList } from "@/actions/profile.actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetPortal,
  SheetTitle,
} from "../ui/sheet";
import { useCallback, useEffect, useRef, useState } from "react";
import { Resume } from "@/models/profile.model";
import { toast } from "../ui/use-toast";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import Loading from "../Loading";
import { AiModel, defaultModel } from "@/models/ai.model";
import { AiJobMatchResponseContent } from "./AiJobMatchResponseContent";
import { getFromLocalStorage } from "@/utils/localstorage.utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Info, CheckCircle, XCircle } from "lucide-react";
import { checkIfModelIsRunning } from "@/utils/ai.utils";
import { JobMatchSchema } from "@/models/ai.schemas";

interface AiSectionProps {
  aISectionOpen: boolean;
  triggerChange: (openState: boolean) => void;
  jobId: string;
}

export const AiJobMatchSection = ({
  aISectionOpen,
  triggerChange,
  jobId,
}: AiSectionProps) => {
  const [selectedResumeId, setSelectedResumeId] = useState<string>();
  const [runningModelName, setRunningModelName] = useState<string>("");
  const [runningModelError, setRunningModelError] = useState<string>("");

  const selectedModel: AiModel = getFromLocalStorage(
    "aiSettings",

    defaultModel,
  );
  const resumesRef = useRef<Resume[]>([]);

  // Standard single-agent mode
  const { object, submit, isLoading, stop } = useObject({
    api: "/api/ai/resume/match",
    schema: JobMatchSchema,
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Error!",
        description: err.message || "Failed to get job match analysis",
      });
    },
  });

  const getResumes = async () => {
    try {
      const { data, success, message } = await getResumeList();
      if (!data || data.length === 0) {
        return;
      }
      resumesRef.current = data;
      if (!success) {
        throw new Error(message);
      }
    } catch (error) {
      const message = "Error fetching resume list";
      const description = error instanceof Error ? error.message : message;
      toast({
        variant: "destructive",
        title: "Error!",
        description,
      });
    }
  };

  const getJobMatch = (resumeId: string, jobId: string) => {
    submit({ resumeId, jobId, selectedModel });
  };

  const checkModelStatus = useCallback(async () => {
    setRunningModelName("");
    setRunningModelError("");
    const result = await checkIfModelIsRunning(
      selectedModel.model,
      selectedModel.provider,
    );
    if (result.isRunning && result.runningModelName) {
      setRunningModelName(result.runningModelName);
    } else if (result.error) {
      setRunningModelError(result.error);
    }
  }, [selectedModel.model, selectedModel.provider]);

  const onOpenChange = async (openState: boolean) => {
    triggerChange(openState);
    if (!openState && isLoading) {
      stop();
    }
    if (openState && selectedModel.provider === "ollama") {
      await checkModelStatus();
    } else if (!openState) {
      setRunningModelName("");
      setRunningModelError("");
      setSelectedResumeId(undefined);
    }
  };

  const onSelectResume = (resumeId: string) => {
    setSelectedResumeId(resumeId);
    getJobMatch(resumeId, jobId);
  };

  useEffect(() => {
    getResumes();
  }, []);

  useEffect(() => {
    if (aISectionOpen && selectedModel.provider === "ollama") {
      checkModelStatus();
    }
  }, [aISectionOpen, selectedModel.provider, checkModelStatus]);

  // Check if we have any content to show
  const hasContent =
    object && (object.matchScore !== undefined || object.summary);

  return (
    <Sheet open={aISectionOpen} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetContent className="overflow-y-scroll">
          <SheetHeader>
            <SheetTitle className="flex flex-row items-center">
              AI Job Match ({selectedModel.provider})
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

          {!selectedResumeId && (
            <div className="mt-4">
              <Select
                value={selectedResumeId}
                onValueChange={onSelectResume}
                disabled={
                  isLoading ||
                  (selectedModel.provider === "ollama" && !runningModelName)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a resume" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {resumesRef.current.map((resume) => (
                      <SelectItem
                        key={resume.id}
                        value={resume.id!}
                        className="capitalize"
                      >
                        {resume.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="mt-2">
            {isLoading && !hasContent ? (
              <div className="flex items-center flex-col mt-4">
                <Loading />
                <div className="mt-2">Analyzing job match...</div>
              </div>
            ) : (
              <AiJobMatchResponseContent
                content={object}
                isStreaming={isLoading}
              />
            )}
          </div>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
};
