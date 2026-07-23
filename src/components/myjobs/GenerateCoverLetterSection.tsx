"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import MarkdownIt from "markdown-it";
import { CheckCircle, XCircle, Loader2, Sparkles, X } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetPortal,
  SheetTitle,
} from "../ui/sheet";
import { Button } from "../ui/button";
import Loading from "../Loading";
import { TipTapContentViewer } from "../TipTapContentViewer";
import { SlowResponseWarning } from "../common/SlowResponseWarning";
import { toastSuccess, toastError } from "@/lib/toast";
import { APP_CONSTANTS } from "@/lib/constants";
import { AiModel, defaultModel } from "@/models/ai.model";
import { useSheetAutoScroll } from "@/hooks/useSheetAutoScroll";
import { useResizablePanel } from "@/hooks/useResizablePanel";
import { useSlowResponseWarning } from "@/hooks/useSlowResponseWarning";
import { checkOllamaConnection } from "@/utils/ai.utils";
import { getUserSettings } from "@/actions/userSettings.actions";
import { getDefaultResumeId, getResumeList } from "@/actions/profile.actions";
import { Resume } from "@/models/profile.model";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { streamCoverLetter } from "@/utils/streamCoverLetter.utils";
import { generateCoverLetterForJob } from "@/actions/coverLetter.actions";

// html:false escapes raw HTML from the model; TipTapContentViewer strips
// anything left over.
const md = new MarkdownIt({ html: false, linkify: false, breaks: true });

interface GenerateCoverLetterSectionProps {
  open: boolean;
  triggerChange: (openState: boolean) => void;
  jobId: string;
  jobResumeId?: string | null;
  onSaved?: (coverLetterId: string, title: string) => void;
}

export const GenerateCoverLetterSection = ({
  open,
  triggerChange,
  jobId,
  jobResumeId,
  onSaved,
}: GenerateCoverLetterSectionProps) => {
  const [selectedModel, setSelectedModel] = useState<AiModel>(defaultModel);
  const [ollamaConnected, setOllamaConnected] = useState<boolean | null>(null);
  const [connectionError, setConnectionError] = useState("");
  const [resumes, setResumes] = useState<Resume[] | null>(null);
  const [needsPicker, setNeedsPicker] = useState(false);
  const [letter, setLetter] = useState("");
  const [savedTitle, setSavedTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false);
  const { scrollAnchorRef, handleSheetScroll, resetScroll } =
    useSheetAutoScroll(isLoading, letter);
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
      }
    };
    fetchSettings();
  }, []);

  const generate = useCallback(
    async (resumeId: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      resetScroll();
      setNeedsPicker(false);
      setLetter("");
      setSavedTitle(null);
      setIsLoading(true);

      try {
        const markdown = await streamCoverLetter({
          jobId,
          resumeId,
          selectedModel,
          signal: controller.signal,
          onUpdate: setLetter,
        });
        // The stream salvages partial text on abort, so don't save a letter
        // the user cancelled by closing the sheet.
        if (controller.signal.aborted) return;
        setLetter(markdown);

        const res = await generateCoverLetterForJob(jobId, markdown);
        if (res?.success) {
          setSavedTitle(res.data.title);
          onSaved?.(res.data.id, res.data.title);
          toastSuccess(`Saved as “${res.data.title}”`);
        } else {
          toastError(res?.message || "Failed to save cover letter");
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        toastError(
          err instanceof Error ? err.message : "Failed to generate cover letter",
        );
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setIsLoading(false);
      }
    },
    [jobId, selectedModel, onSaved, resetScroll],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  const checkConnectionStatus = useCallback(async () => {
    setOllamaConnected(null);
    setConnectionError("");
    const result = await checkOllamaConnection(selectedModel.provider);
    setOllamaConnected(result.isConnected);
    if (!result.isConnected) {
      setConnectionError(result.error || "Ollama is not reachable.");
    }
  }, [selectedModel.provider]);

  // Resolve a resume, then generate — once per open. startedRef stops the
  // settings effect from re-triggering generation mid-stream.
  useEffect(() => {
    if (!open) {
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    if (selectedModel.provider === "ollama") {
      checkConnectionStatus();
    }

    const resolveAndGenerate = async () => {
      const [defaultResumeId, list] = await Promise.all([
        getDefaultResumeId(),
        getResumeList(
          1,
          APP_CONSTANTS.RECORDS_PER_PAGE,
          APP_CONSTANTS.MIN_RESUME_SECTIONS_FOR_SELECTION,
        ),
      ]);

      const eligible: Resume[] = list?.data ?? [];
      setResumes(eligible);

      // A default resume too thin for MIN_RESUME_SECTIONS_FOR_SELECTION would
      // fail in preprocessResume, so only accept one that survived the filter.
      const fallback = eligible.some((r) => r.id === defaultResumeId)
        ? defaultResumeId
        : null;
      const resolved = jobResumeId ?? fallback;

      if (resolved) {
        generate(resolved);
      } else {
        setNeedsPicker(eligible.length > 0);
      }
    };

    resolveAndGenerate();
  }, [
    open,
    jobResumeId,
    generate,
    checkConnectionStatus,
    selectedModel.provider,
  ]);

  const onOpenChange = (openState: boolean) => {
    triggerChange(openState);
    if (!openState) {
      if (isLoading) stop();
      setLetter("");
      setSavedTitle(null);
      setNeedsPicker(false);
      setResumes(null);
      setOllamaConnected(null);
      setConnectionError("");
    }
  };

  const html = useMemo(() => (letter ? md.render(letter) : ""), [letter]);
  const showSlowWarning = useSlowResponseWarning(isLoading, !!letter);

  const statusIcon =
    selectedModel.provider === "ollama" ? (
      ollamaConnected === null ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
      ) : ollamaConnected ? (
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetContent
          className="flex flex-col p-0 overflow-hidden [&>button:last-child]:hidden"
          style={{
            width: `${width}px`,
            maxWidth: `${APP_CONSTANTS.RESIZABLE_PANEL_MAX_WIDTH_RATIO * 100}vw`,
          }}
        >
          <div
            className="absolute left-0 top-0 h-full w-1 cursor-col-resize z-10 group"
            onMouseDown={handleMouseDown}
          >
            <div className="h-full w-px bg-transparent group-hover:bg-primary/50 transition-colors" />
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/20 shrink-0">
            <SheetTitle className="text-[11px] font-bold tracking-[0.15em] uppercase text-foreground leading-none shrink-0 m-0">
              AI COVER LETTER
            </SheetTitle>
            <span className="text-muted-foreground/30 text-xs select-none">
              ···
            </span>
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

          <div
            className="flex-1 overflow-y-auto px-6 pt-4 pb-6"
            onScroll={handleSheetScroll}
          >
            {selectedModel.provider === "ollama" &&
              ollamaConnected === false &&
              connectionError && (
                <p className="text-xs text-red-600">{connectionError}</p>
              )}

            {needsPicker && (
              <div className="flex flex-col items-center gap-2 pt-12">
                <p className="text-sm text-muted-foreground">
                  Which resume should this letter draw on?
                </p>
                <Select onValueChange={generate}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a resume" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(resumes ?? []).map((resume) => (
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

            {resumes?.length === 0 && (
              <p className="pt-12 text-center text-sm text-muted-foreground">
                Create a resume with at least{" "}
                {APP_CONSTANTS.MIN_RESUME_SECTIONS_FOR_SELECTION} sections to
                generate a cover letter.
              </p>
            )}

            {isLoading && !letter ? (
              <div className="flex items-center flex-col mt-4">
                <Loading />
                <div className="mt-2">Writing your cover letter...</div>
                {showSlowWarning && <SlowResponseWarning />}
              </div>
            ) : (
              html && (
                <div className="text-sm leading-relaxed [&_p]:mt-3">
                  <TipTapContentViewer content={html} />
                </div>
              )
            )}

            {savedTitle && (
              <p className="mt-6 text-xs text-muted-foreground">
                Saved as “{savedTitle}” —{" "}
                <Link href="/dashboard/profile" className="underline">
                  edit it in Profile → Documents
                </Link>
              </p>
            )}
            <div ref={scrollAnchorRef} />
          </div>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
};
