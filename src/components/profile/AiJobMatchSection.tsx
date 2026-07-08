"use client";

import { getResumeList } from "@/actions/profile.actions";
import { saveJobMatchResult } from "@/actions/job.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetPortal,
  SheetTitle,
} from "../ui/sheet";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSheetAutoScroll } from "@/hooks/useSheetAutoScroll";
import { useResizablePanel } from "@/hooks/useResizablePanel";
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
import { CheckCircle, XCircle, Loader2, Sparkles, X } from "lucide-react";
import { checkOllamaConnection } from "@/utils/ai.utils";
import {
  streamJobMatch,
  type JobMatchResult,
} from "@/utils/streamJobMatch.utils";
import { getUserSettings } from "@/actions/userSettings.actions";
import { useSlowResponseWarning } from "@/hooks/useSlowResponseWarning";
import { SlowResponseWarning } from "../common/SlowResponseWarning";
import { Button } from "../ui/button";

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
  const [result, setResult] = useState<JobMatchResult | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const resumesRef = useRef<Resume[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const { scrollAnchorRef, handleSheetScroll, resetScroll } = useSheetAutoScroll(isLoading, result);
  const { width, handleMouseDown } = useResizablePanel("ai-panel-width");

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

  const saveMatch = useCallback(
    (resumeId: string, matchResult: JobMatchResult) => {
      const scores = matchResult.scores;
      if (!scores) return;

      const resumeTitle =
        resumesRef.current.find((r) => r.id === resumeId)?.title ??
        "Unknown Resume";
      const matchData = JSON.stringify({
        matchScore: scores.matchScore,
        recommendation: scores.recommendation,
        body: matchResult.body,
        resumeId,
        resumeTitle,
        matchedAt: new Date().toISOString(),
        provider: selectedModel.provider,
        model: selectedModel.model,
      });

      saveJobMatchResult(jobId, scores.matchScore, matchData).then((res) => {
        if (res?.success) {
          onMatchSaved?.(scores.matchScore, matchData);
          toast({ title: "Match result saved" });
        } else {
          toast({
            variant: "destructive",
            title: "Error!",
            description: res?.message || "Failed to save match result",
          });
        }
      });
    },
    [jobId, onMatchSaved, selectedModel.provider, selectedModel.model],
  );

  const getResumes = async () => {
    try {
      const { data, success, message } = await getResumeList(
        1,
        APP_CONSTANTS.RECORDS_PER_PAGE,
        APP_CONSTANTS.MIN_RESUME_SECTIONS_FOR_SELECTION,
      );
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

  const getJobMatch = async (resumeId: string, jobId: string) => {
    const controller = new AbortController();
    abortRef.current = controller;
    resetScroll();
    setResult(undefined);
    setIsLoading(true);

    try {
      const matchResult = await streamJobMatch({
        resumeId,
        jobId,
        selectedModel,
        signal: controller.signal,
        onUpdate: setResult,
      });
      // streamJobMatch salvages partial data on abort and resolves, so guard
      // against saving a match the user cancelled by closing the sheet.
      if (controller.signal.aborted) return;
      saveMatch(resumeId, matchResult);
    } catch (err) {
      // Aborting (e.g. closing the sheet) is expected — don't toast.
      if (controller.signal.aborted) return;
      toast({
        variant: "destructive",
        title: "Error!",
        description:
          err instanceof Error ? err.message : "Failed to get job match analysis",
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsLoading(false);
    }
  };

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

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
      stop();
    }
    if (openState && selectedModel.provider === "ollama") {
      await checkConnectionStatus();
    } else if (!openState) {
      setOllamaConnected(null);
      setConnectionError("");
      setSelectedResumeId(undefined);
      setResult(undefined);
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

  const hasContent = !!(result && (result.scores || result.body));

  const showSlowWarning = useSlowResponseWarning(isLoading, hasContent);

  const statusIcon =
    selectedModel.provider === "ollama" ? (
      ollamaConnected === null ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
      ) : ollamaConnected === true ? (
        <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-500" />
      ) : (
        <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
      )
    ) : (
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    );

  const providerLabel =
    selectedModel.provider.charAt(0).toUpperCase() +
    selectedModel.provider.slice(1);

  return (
    <Sheet open={aISectionOpen} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetContent
          className="flex flex-col p-0 overflow-hidden [&>button:last-child]:hidden"
          style={{
            width: `${width}px`,
            maxWidth: `${APP_CONSTANTS.RESIZABLE_PANEL_MAX_WIDTH_RATIO * 100}vw`,
          }}
        >
          {/* VS Code-style drag handle on left edge */}
          <div
            className="absolute left-0 top-0 h-full w-1 cursor-col-resize z-10 group"
            onMouseDown={handleMouseDown}
          >
            <div className="h-full w-px bg-transparent group-hover:bg-primary/50 transition-colors" />
          </div>
          {/* Terminal-style tab bar — always visible */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/20 shrink-0">
            <SheetTitle className="text-[11px] font-bold tracking-[0.15em] uppercase text-foreground leading-none shrink-0 m-0">
              AI JOB MATCH
            </SheetTitle>
            <span className="text-muted-foreground/30 text-xs select-none">···</span>
            <div className="flex items-center gap-1.5 min-w-0">
              {statusIcon}
              <span className="text-xs text-muted-foreground font-mono truncate">
                {selectedModel.model
                  ? `${providerLabel} / ${selectedModel.model}`
                  : providerLabel}
              </span>
            </div>
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto shrink-0 rounded-sm opacity-70 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </SheetClose>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6" onScroll={handleSheetScroll}>
            {selectedModel.provider === "ollama" &&
              ollamaConnected === false &&
              connectionError && (
                <p className="text-xs text-red-600">{connectionError}</p>
              )}

            {!isLoading && !selectedResumeId && (
              <div className={`flex flex-col items-center gap-2${!hasContent ? " pt-12" : " py-2"}`}>
                <Select
                  value={selectedResumeId}
                  onValueChange={onSelectResume}
                  disabled={
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
                  scores={result?.scores}
                  body={result?.body}
                  isStreaming={isLoading}
                />
              )}
            </div>
            <div ref={scrollAnchorRef} />
          </div>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
};
