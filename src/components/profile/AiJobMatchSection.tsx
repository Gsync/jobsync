"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { getResumeList } from "@/actions/profile.actions";
import { saveJobMatchResult } from "@/actions/job.actions";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Info, CheckCircle, XCircle } from "lucide-react";
import { checkOllamaConnection } from "@/utils/ai.utils";
import { JobMatchSchema } from "@/models/ai.schemas";
import { getUserSettings } from "@/actions/userSettings.actions";
import { useSlowResponseWarning } from "@/hooks/useSlowResponseWarning";
import { SlowResponseWarning } from "../common/SlowResponseWarning";

interface AiSectionProps {
  aISectionOpen: boolean;
  triggerChange: (openState: boolean) => void;
  jobId: string;
  onMatchSaved?: (matchScore: number, matchData: string) => void;
}

export const AiJobMatchSection = ({
  aISectionOpen,
  triggerChange,
  jobId,
  onMatchSaved,
}: AiSectionProps) => {
  const [selectedResumeId, setSelectedResumeId] = useState<string>();
  const [ollamaConnected, setOllamaConnected] = useState<boolean | null>(null);
  const [connectionError, setConnectionError] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<AiModel>(defaultModel);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const resumesRef = useRef<Resume[]>([]);
  const wasLoadingRef = useRef(false);
  const stoppedByUserRef = useRef(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const result = await getUserSettings();
        if (result.success && result.data?.settings?.ai) {
          const aiSettings = result.data.settings.ai;
          setSelectedModel({
            provider: aiSettings.provider || defaultModel.provider,
            model: aiSettings.model,
          });
        }
      } catch (error) {
        console.error("Error fetching AI settings:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    fetchSettings();
  }, []);

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

  useEffect(() => {
    if (isLoading) {
      wasLoadingRef.current = true;
      return;
    }
    if (!wasLoadingRef.current || !object?.matchScore) return;
    wasLoadingRef.current = false;
    if (stoppedByUserRef.current) {
      stoppedByUserRef.current = false;
      return;
    }

    const resumeTitle =
      resumesRef.current.find((r) => r.id === selectedResumeId)?.title ??
      "Unknown Resume";
    const matchData = JSON.stringify({
      ...object,
      resumeId: selectedResumeId,
      resumeTitle,
      matchedAt: new Date().toISOString(),
    });
    const score = object.matchScore;

    saveJobMatchResult(jobId, score, matchData).then((result) => {
      if (result?.success) {
        onMatchSaved?.(score, matchData);
        toast({ title: "Match result saved" });
      } else {
        toast({
          variant: "destructive",
          title: "Error!",
          description: result?.message || "Failed to save match result",
        });
      }
    });
  }, [isLoading, object, jobId, selectedResumeId, onMatchSaved]);

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

  const checkConnectionStatus = useCallback(async () => {
    setOllamaConnected(null);
    setConnectionError("");
    const result = await checkOllamaConnection(selectedModel.provider);
    if (result.isConnected) {
      setOllamaConnected(true);
    } else {
      setOllamaConnected(false);
      setConnectionError(result.error || "Ollama is not reachable.");
    }
  }, [selectedModel.provider]);

  const onOpenChange = async (openState: boolean) => {
    triggerChange(openState);
    if (!openState && isLoading) {
      stoppedByUserRef.current = true;
      stop();
    }
    if (openState && selectedModel.provider === "ollama") {
      await checkConnectionStatus();
    } else if (!openState) {
      setOllamaConnected(null);
      setConnectionError("");
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
      checkConnectionStatus();
    }
  }, [aISectionOpen, selectedModel.provider, checkConnectionStatus]);

  // Check if we have any content to show
  const hasContent =
    object && (object.matchScore !== undefined || object.summary);

  const showSlowWarning = useSlowResponseWarning(isLoading, !!hasContent);

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
              {ollamaConnected === true && (
                <div className="flex items-center gap-1 text-green-600 text-sm mt-4">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Ollama is connected</span>
                </div>
              )}
              {ollamaConnected === false && (
                <div className="flex items-center gap-1 text-red-600 text-sm mt-4">
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{connectionError}</span>
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
                  isLoadingSettings ||
                  (selectedModel.provider === "ollama" && ollamaConnected === false)
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
                {showSlowWarning && <SlowResponseWarning />}
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
