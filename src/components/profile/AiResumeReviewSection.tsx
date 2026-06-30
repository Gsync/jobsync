"use client";

import { Sparkles, CheckCircle, XCircle, Loader2, X } from "lucide-react";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import Loading from "../Loading";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSheetAutoScroll } from "@/hooks/useSheetAutoScroll";
import { useResizablePanel } from "@/hooks/useResizablePanel";
import { toast } from "../ui/use-toast";
import { Resume } from "@/models/profile.model";
import { AiModel, AiProvider, defaultModel } from "@/models/ai.model";
import { AiResumeReviewResponseContent } from "./AiResumeReviewResponseContent";
import {
  streamResumeReview,
  type ResumeReviewResult,
} from "@/utils/streamResumeReview.utils";
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
  const { width, handleMouseDown } = useResizablePanel("ai-panel-width");

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

  // Status icon for the terminal header bar
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
        <SheetContent
          className="flex flex-col p-0 overflow-hidden [&>button:last-child]:hidden"
          style={{ width: `${width}px`, maxWidth: "none" }}
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
              AI REVIEW
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

          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6" onScroll={handleSheetScroll}>
            {!isLoading && <div className={`flex justify-center items-center${!hasContent ? " min-h-[calc(100dvh-9rem)]" : " py-2"}`}>
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
            </div>}

            {selectedModel.provider === "ollama" &&
              ollamaConnected === false &&
              connectionError && (
                <p className="text-xs text-destructive mt-2">{connectionError}</p>
              )}

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
          </div>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
};

export default AiResumeReviewSection;
