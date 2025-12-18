"use client";
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
import { AiModel, defaultModel, JobMatchResponse } from "@/models/ai.model";
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
  const [aIContent, setAIContent] = useState<JobMatchResponse | any>("");
  const [loading, setLoading] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string>();
  const [runningModelName, setRunningModelName] = useState<string>("");
  const [runningModelError, setRunningModelError] = useState<string>("");
  const selectedModel: AiModel = getFromLocalStorage(
    "aiSettings",
    defaultModel
  );

  const resumesRef = useRef<Resume[]>([]);
  const getResumes = async () => {
    try {
      const { data, total, success, message } = await getResumeList();
      if (!data || data.ResumeSections?.length === 0) {
        throw new Error("Resume content is required");
      }
      resumesRef.current = data;
      if (!success) {
        setLoading(false);
        throw new Error(message);
      }
    } catch (error) {
      const message = "Error fetching resume list";
      const description = error instanceof Error ? error.message : message;
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Error!",
        description,
      });
    }
  };
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
    null
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  const getJobMatch = async (resumeId: string, jobId: string) => {
    try {
      setLoading(true);
      // if (
      //   abortControllerRef.current
      //   //   && (await readerRef?.current?.closed) === false
      // ) {
      //   await abortStream();
      // }
      setAIContent("");
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const response = await fetch("/api/ai/resume/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, jobId, selectedModel }),
        signal: abortController.signal,
      });

      if (!response.body) {
        setLoading(false);
        throw new Error("No response body");
      }

      if (!response.ok) {
        setLoading(false);
        throw new Error(response.statusText);
      }

      const reader = response.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let done = false;
      setLoading(false);

      while (!done && !abortController.signal.aborted) {
        const { value, done: doneReading } = await reader.read();

        done = doneReading;
        const chunk = decoder.decode(value, { stream: !done });
        const parsedChunk = JSON.parse(JSON.stringify(chunk));
        setAIContent((prev: any) => prev + parsedChunk);
      }
      reader.releaseLock();
    } catch (error) {
      const message = "Error fetching job matching response";
      const description = error instanceof Error ? error.message : message;
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Error!",
        description,
      });
    }
  };

  const abortStream = async () => {
    abortControllerRef.current?.abort();
    console.log("aborting stream");
    await readerRef?.current?.cancel();
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
    if (openState && selectedModel.provider === "ollama") {
      // Check model status when sheet opens for Ollama
      await checkModelStatus();
    } else if (openState === false) {
      // Clear status when closing
      setRunningModelName("");
      setRunningModelError("");
    }
  };

  const onSelectResume = async (resumeId: string) => {
    setSelectedResumeId(resumeId);
    await getJobMatch(resumeId, jobId);
  };

  useEffect(() => {
    getResumes();
  }, []);

  useEffect(() => {
    // Check model status when sheet is open (handles initial mount)
    if (aISectionOpen && selectedModel.provider === "ollama") {
      checkModelStatus();
    }
  }, [aISectionOpen, selectedModel.provider, checkModelStatus]);

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
                  loading ||
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
            {loading ? (
              <div className="flex items-center flex-col">
                <Loading />
                <div>Loading...</div>
              </div>
            ) : (
              <>
                <AiJobMatchResponseContent content={aIContent} />
                {/* <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
                  <code className="text-white">{aIContent}</code>
                </pre> */}
              </>
            )}
          </div>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
};
