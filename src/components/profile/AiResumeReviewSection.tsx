"use client";

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
import { useState, useEffect, useCallback, useRef } from "react";
import { useSheetAutoScroll } from "@/hooks/useSheetAutoScroll";
import { toast } from "../ui/use-toast";
import { Resume } from "@/models/profile.model";
import { AiModel, AiProvider, defaultModel } from "@/models/ai.model";
import { AiResumeReviewResponseContent } from "./AiResumeReviewResponseContent";
import {
  streamResumeReview,
  type ResumeReviewResult,
} from "@/utils/streamResumeReview.utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { checkOllamaConnection } from "@/utils/ai.utils";
import { getUserSettings } from "@/actions/userSettings.actions";
import { useSlowResponseWarning } from "@/hooks/useSlowResponseWarning";
import { SlowResponseWarning } from "../common/SlowResponseWarning";

interface AiSectionProps {
  resume: Resume;
}

const AiResumeReviewSection = ({ resume }: AiSectionProps) => {
  const [aISectionOpen, setAiSectionOpen] = useState(false);
  const [ollamaConnected, setOllamaConnected] = useState<boolean | null>(null);
  const [connectionError, setConnectionError] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<AiModel>(defaultModel);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  const checkConnectionStatus = useCallback(async (provider: AiProvider) => {
    setOllamaConnected(null);
    setConnectionError("");
    const result = await checkOllamaConnection(provider);
    if (result.isConnected) {
      setOllamaConnected(true);
    } else {
      setOllamaConnected(false);
      setConnectionError(result.error || "Ollama is not reachable.");
    }
  }, []);

  useEffect(() => {
    if (!aISectionOpen) return;
    const fetchSettings = async () => {
      try {
        const result = await getUserSettings();
        if (result.success && result.data?.settings?.ai) {
          const aiSettings = result.data.settings.ai;
          const model: AiModel = {
            provider: aiSettings.provider || defaultModel.provider,
            model: aiSettings.model,
          };
          setSelectedModel(model);
          // Only check Ollama connectivity once we know the actual provider
          if (model.provider === "ollama") {
            await checkConnectionStatus(model.provider);
          }
        }
      } catch (error) {
        console.error("Error fetching AI settings:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    fetchSettings();
  }, [aISectionOpen, checkConnectionStatus]);

  const [result, setResult] = useState<ResumeReviewResult | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { scrollAnchorRef, handleSheetScroll, resetScroll } = useSheetAutoScroll(isLoading, result);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  const getResumeReview = async () => {
    if (!resume || (resume.ResumeSections?.length ?? 0) < 2) {
      toast({
        variant: "destructive",
        title: "Not enough content",
        description:
          "Add at least 2 sections (e.g. Summary and Experience) before running a review.",
      });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    resetScroll();
    setResult(undefined);
    setIsLoading(true);

    try {
      await streamResumeReview({
        resumeId: resume.id!,
        selectedModel,
        signal: controller.signal,
        onUpdate: setResult,
      });
    } catch (err) {
      // Aborting (e.g. closing the sheet) is expected — don't toast.
      if (controller.signal.aborted) return;
      toast({
        variant: "destructive",
        title: "Error!",
        description:
          err instanceof Error ? err.message : "Failed to get AI review",
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsLoading(false);
    }
  };

  const triggerSheetChange = (openState: boolean) => {
    setAiSectionOpen(openState);
    if (!openState && isLoading) {
      stop();
    }
  };

  // Check if we have any content to show
  const hasContent = !!(result && (result.scores || result.body));

  const showSlowWarning = useSlowResponseWarning(isLoading, !!hasContent);

  return (
    <Sheet open={aISectionOpen} onOpenChange={triggerSheetChange}>
      <div className="ml-2">
        <SheetTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 cursor-pointer"
            onClick={() => triggerSheetChange(true)}
            disabled={isLoading || isLoadingSettings}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Review
            </span>
          </Button>
        </SheetTrigger>
      </div>
      <SheetPortal>
        <SheetContent className="overflow-y-scroll" onScroll={handleSheetScroll}>
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

          <div className="mt-4">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 cursor-pointer"
              onClick={getResumeReview}
              disabled={
                isLoading ||
                (selectedModel.provider === "ollama" &&
                  ollamaConnected === false)
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
              {showSlowWarning && <SlowResponseWarning />}
            </div>
          ) : (
            <AiResumeReviewResponseContent
              scores={result?.scores}
              body={result?.body}
              isStreaming={isLoading}
            />
          )}
          <div ref={scrollAnchorRef} />
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
};

export default AiResumeReviewSection;
