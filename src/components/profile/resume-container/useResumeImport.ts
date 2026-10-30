"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toastError } from "@/lib/toast";
import { deleteResumeById } from "@/actions/profile.actions";
import { resolveImportCard } from "@/actions/resumeImport.actions";
import { getUserSettings } from "@/actions/userSettings.actions";
import { AiModel, defaultModel } from "@/models/ai.model";
import type { Resume } from "@/models/profile.model";
import { checkLocalProviderConnection } from "@/utils/ai.utils";
import { PROVIDER_REGISTRY } from "@/lib/ai/provider-registry";
import { streamResumeImport } from "@/utils/resumeImportStream.utils";
import {
  buildPendingCards,
  filterUnrecognizedSections,
  PendingCard,
} from "./pendingCards";

// Owns the resume-import review flow: streaming the document into pending
// cards, the AI availability probe behind "Structure with AI", and accepting,
// discarding or abandoning the import.
export function useResumeImport(resume: Resume) {
  const router = useRouter();

  // Import review mode state
  const [pendingCards, setPendingCards] = useState<PendingCard[]>([]);
  const [importTruncated, setImportTruncated] = useState(false);
  const [unrecognizedSections, setUnrecognizedSections] = useState<string[]>(
    [],
  );
  const [importMode, setImportMode] = useState(false);

  // AI availability for "Structure with AI" button
  const [aiModel, setAiModel] = useState<AiModel>(defaultModel);
  const [aiReady, setAiReady] = useState(false);
  const [localProviderConnected, setLocalProviderConnected] = useState<
    boolean | null
  >(
    null,
  );
  const [connectionError, setConnectionError] = useState<string>("");
  // Plain boolean (not useTransition): streaming fires rapid state updates that
  // must not run as interruptible transition renders.
  const [isStructuring, setIsStructuring] = useState(false);
  // Aborts the in-flight import fetch so the server stops the LLM generation
  // when the user navigates away or the component unmounts.
  const importAbortRef = useRef<AbortController | null>(null);
  // Holds the model for an auto-import triggered from the create dialog so it
  // survives a Strict Mode remount after the sessionStorage key is consumed.
  const pendingAutoImportRef = useRef<AiModel | null>(null);

  // Runs the import stream, rendering cards progressively as they arrive.
  // The caller owns the AbortController so each invocation is independent —
  // this keeps the callback stable and survives React Strict Mode's
  // mount/unmount/remount of the auto-start effect (aborted run is discarded,
  // the remounted run completes).
  const runImport = useCallback(
    async (model: AiModel, abortController: AbortController) => {
      const resumeId = resume.id;
      if (!resumeId) return;
      setIsStructuring(true);
      setImportMode(true);
      importAbortRef.current = abortController;
      try {
        const { data, truncated } = await streamResumeImport({
          resumeId,
          selectedModel: model,
          signal: abortController.signal,
          onPartial: (partial) => {
            if (abortController.signal.aborted) return;
            const cards = buildPendingCards(partial);
            if (cards.length > 0) setPendingCards(cards);
          },
        });

        if (abortController.signal.aborted) return;
        const cards = buildPendingCards(data);
        if (cards.length === 0) {
          setImportMode(false);
          toastError(
            "No structured data could be extracted from the document.",
            "No sections found",
          );
          return;
        }
        setPendingCards(cards);
        setImportTruncated(truncated);
        setUnrecognizedSections(
          filterUnrecognizedSections(data.unrecognizedSections ?? []),
        );
      } catch (error) {
        // Client-initiated abort (unmount/navigation) — not a user-facing error.
        if (abortController.signal.aborted) return;
        setImportMode(false);
        toastError(
          error instanceof Error ? error.message : "Failed to contact AI service.",
        );
      } finally {
        if (importAbortRef.current === abortController) {
          importAbortRef.current = null;
        }
        // Don't reset on an aborted run: a concurrent (remounted) run may be
        // live and still structuring.
        if (!abortController.signal.aborted) {
          setIsStructuring(false);
        }
      }
    },
    [resume.id],
  );

  // Abort any in-flight import when the component unmounts.
  useEffect(() => {
    return () => importAbortRef.current?.abort();
  }, []);

  // Auto-start the import stream when arriving from the create dialog.
  // The pending model is captured into a ref (not re-read from sessionStorage)
  // so the request survives Strict Mode's remount even though the storage key
  // is consumed on first read. Each run owns its controller and aborts only
  // that controller on cleanup — the canonical mount/abort pattern.
  useEffect(() => {
    if (!resume.id) return;
    const key = `import-pending:${resume.id}`;
    const stored = sessionStorage.getItem(key);
    if (stored) {
      sessionStorage.removeItem(key);
      try {
        pendingAutoImportRef.current = (
          JSON.parse(stored) as { selectedModel: AiModel }
        ).selectedModel;
      } catch {
        // Malformed sessionStorage entry — ignore
      }
    }
    const model = pendingAutoImportRef.current;
    if (!model) return;
    const controller = new AbortController();
    runImport(model, controller);
    return () => controller.abort();
  }, [resume.id, runImport]);

  // Tab-close guard while pending cards exist
  useEffect(() => {
    if (pendingCards.length === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pendingCards.length]);

  // Load AI settings for "Structure with AI" button
  useEffect(() => {
    if (resume.File?.filePath && !importMode) {
      getUserSettings().then((result) => {
        if (result.success && result.data?.settings?.ai) {
          const ai = result.data.settings.ai;
          const model: AiModel = {
            provider: ai.provider || defaultModel.provider,
            model: ai.model,
          };
          setAiModel(model);
          setAiReady(true);
          if (PROVIDER_REGISTRY[model.provider]?.category === "local") {
            setLocalProviderConnected(null);
            setConnectionError("");
            checkLocalProviderConnection(model.provider).then((result) => {
              setLocalProviderConnected(result.isConnected);
              if (!result.isConnected) {
                setConnectionError(
                  result.error ||
                    `${PROVIDER_REGISTRY[model.provider].displayName} is not reachable.`,
                );
              }
            });
          }
        }
      });
    }
  }, [resume.File?.filePath, importMode]);

  const handleAcceptCard = useCallback(
    async (cardId: string) => {
      const pending = pendingCards.find((c) => c.id === cardId);
      if (!pending || !resume.id) return;
      const result = await resolveImportCard(resume.id, pending.card);
      if (result.success) {
        setPendingCards((prev) => prev.filter((c) => c.id !== cardId));
        router.refresh();
      } else {
        toastError(result.message);
      }
    },
    [pendingCards, resume.id, router],
  );

  const handleDiscardCard = useCallback((cardId: string) => {
    setPendingCards((prev) => prev.filter((c) => c.id !== cardId));
  }, []);

  const handleDiscardImport = async () => {
    if (!resume.id) return;
    importAbortRef.current?.abort();
    const result = await deleteResumeById(resume.id);
    if (result?.success) {
      router.push("/dashboard/profile");
    } else {
      toastError(result?.message);
    }
  };

  const handleStructureWithAI = () => runImport(aiModel, new AbortController());

  return {
    pendingCards,
    importTruncated,
    unrecognizedSections,
    importMode,
    aiModel,
    aiReady,
    localProviderConnected,
    connectionError,
    isStructuring,
    handleAcceptCard,
    handleDiscardCard,
    handleDiscardImport,
    handleStructureWithAI,
  };
}
