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
import { useCollaborativeAnalysis } from "@/hooks/useCollaborativeAnalysis";
import { MultiAgentProgress } from "./MultiAgentProgress";
import { JobMatchResponse } from "@/models/ai.model";

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
  const [useCollaboration, setUseCollaboration] = useState<boolean>(false);

  const selectedModel: AiModel = getFromLocalStorage(
    "aiSettings",
    defaultModel
  );
  const resumesRef = useRef<Resume[]>([]);

  // Standard single-agent mode
  const {
    object,
    submit,
    isLoading: singleAgentLoading,
    stop,
  } = useObject({
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

  // Multi-agent collaborative mode
  const {
    isLoading: multiAgentLoading,
    result: collaborativeResult,
    error: collaborativeError,
    start: startCollaborative,
    stop: stopCollaborative,
  } = useCollaborativeAnalysis<JobMatchResponse>("job-match");

  const isLoading = useCollaboration ? multiAgentLoading : singleAgentLoading;
  const displayObject = useCollaboration ? collaborativeResult : object;

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
    if (useCollaboration) {
      startCollaborative({ resumeId, jobId, selectedModel });
    } else {
      submit({ resumeId, jobId, selectedModel });
    }
  };

  const checkModelStatus = useCallback(async () => {
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
  }, [selectedModel.model, selectedModel.provider]);

  const onOpenChange = async (openState: boolean) => {
    triggerChange(openState);
    if (!openState && isLoading) {
      if (useCollaboration) {
        stopCollaborative();
      } else {
        stop();
      }
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
    displayObject &&
    (displayObject.matching_score !== undefined ||
      displayObject.detailed_analysis);

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

          {/* Multi-Agent Mode Toggle */}
          <div className="mt-4 p-3 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="collaboration-mode"
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
                        Phase 3: Multi-Agent System
                      </p>
                      <p className="text-xs mb-2">
                        Uses 5 specialized AI agents working together:
                      </p>
                      <ul className="text-xs space-y-1">
                        <li>• Data Analyzer (extracts metrics)</li>
                        <li>• Keyword Expert (ATS optimization)</li>
                        <li>• Scoring Specialist (fair scoring)</li>
                        <li>• Feedback Expert (actionable advice)</li>
                        <li>• Synthesis Coordinator (combines insights)</li>
                      </ul>
                      <p className="text-xs mt-2 text-yellow-500">
                        ⚠️ Slower but significantly more accurate
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <input
                id="collaboration-mode"
                type="checkbox"
                checked={useCollaboration}
                onChange={(e) => setUseCollaboration(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </div>
            {useCollaboration && (
              <p className="text-xs text-muted-foreground mt-2">
                🤖 Multiple AI agents will analyze this job match together
              </p>
            )}
          </div>

          {/* Multi-Agent Progress Indicator */}
          <MultiAgentProgress isActive={useCollaboration && isLoading} />

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
                <div className="mt-2">
                  {useCollaboration
                    ? "Agents collaborating..."
                    : "Analyzing job match..."}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {useCollaboration
                    ? "Multiple agents are analyzing qualifications"
                    : "Agent is comparing qualifications"}
                </div>
              </div>
            ) : (
              <AiJobMatchResponseContent
                content={displayObject}
                isStreaming={isLoading}
              />
            )}
          </div>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
};
