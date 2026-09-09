"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  generateId,
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type ToolUIPart,
  type UIMessage,
} from "ai";
import { hasPendingApproval, stubConsumedPastes } from "@/lib/agent/paste";
import { pageContextFor } from "@/lib/agent/pageContext";
import { useRightRail } from "@/context/RightRailContext";
import { useSidebar } from "@/context/SidebarContext";
import { useResizablePanel } from "@/hooks/useResizablePanel";
import { APP_CONSTANTS } from "@/lib/constants";
import { toastInfo } from "@/lib/toast";
import {
  clearChatConversation,
  saveChatConversation,
} from "@/actions/agentChat.actions";
import { getUserSettings } from "@/actions/userSettings.actions";
import { checkOllamaConnection } from "@/utils/ai.utils";
import { AiProvider } from "@/models/ai.model";
import {
  AGENT_NESTED_STREAM_PART_TYPE,
  isNestedTool,
  type AgentAddJobResult,
  type AgentNestedStreamData,
  type PageContext,
} from "@/models/agent.model";

export const AGENT_CHAT_PANEL_ID = "chat";

type Preflight = {
  checked: boolean;
  ok: boolean;
  error?: string;
  provider?: string;
  model?: string;
};

// Everything the five senders pass. Narrower than chat.sendMessage's union so
// a held message can be re-dispatched and rendered without narrowing again.
type QueuedMessage = { parts: UIMessage["parts"] };

type AgentChatValue = ReturnType<typeof useAgentChatValue>;

const AgentChatContext = createContext<AgentChatValue | null>(null);

// The completed add_job writes in a transcript, by tool call id. Name-checked
// on purpose: created is add_job's field, and another tool reusing it is not a
// job write.
function createdJobToolCallIds(messages: UIMessage[]): string[] {
  const ids: string[] = [];
  for (const message of messages) {
    for (const part of message.parts ?? []) {
      if (!isToolUIPart(part) || part.state !== "output-available") continue;
      if (getToolName(part) !== "add_job") continue;
      if ((part.output as AgentAddJobResult | undefined)?.created !== true) continue;
      ids.push(part.toolCallId);
    }
  }
  return ids;
}

function useAgentChatValue(initialMessages: UIMessage[]) {
  const router = useRouter();
  const pathname = usePathname();
  const { holder, requestOpen, close: releaseRail } = useRightRail();
  const { expanded: sidebarExpanded, collapse: collapseSidebar } = useSidebar();

  const [isOpen, setIsOpen] = useState(false);
  // Lives here, not in the panel: SidebarInset offsets page content by this
  // width so the panel docks beside the page instead of over it.
  // Not "ai-panel-width": that key is shared by the three AI sheets, and
  // dragging this panel would silently resize all of them.
  const {
    width: panelWidth,
    handleMouseDown: startResize,
    isDragging: isResizing,
    isExpanded: isPanelExpanded,
    toggleExpand: togglePanelExpand,
  } = useResizablePanel(APP_CONSTANTS.AGENT_CHAT_PANEL_WIDTH_KEY);

  // The maximized width only makes sense on the page it was expanded on: if
  // the sidebar re-expands it would overlap, and navigating away (sidebar nav
  // links leave the sidebar collapsed) leaves it flush against a new page.
  const lastPathnameRef = useRef(pathname);
  useEffect(() => {
    const navigated = lastPathnameRef.current !== pathname;
    lastPathnameRef.current = pathname;
    if (isPanelExpanded && (sidebarExpanded || navigated)) togglePanelExpand();
  }, [sidebarExpanded, isPanelExpanded, pathname, togglePanelExpand]);

  const [interruptedTurn, setInterruptedTurn] = useState(false);
  const [preflight, setPreflight] = useState<Preflight>({
    checked: false,
    ok: true,
  });

  const pageContextRef = useRef<PageContext>(pageContextFor(pathname));
  useEffect(() => {
    pageContextRef.current = pageContextFor(pathname);
  }, [pathname]);

  // Transient data parts never land in message.parts — the SDK hands them to
  // onData and drops them — so a nested tool's streaming text lives here,
  // keyed by toolCallId so two nested calls cannot collide.
  const [toolStreams, setToolStreams] = useState<Record<string, string>>({});

  // Job rows changed server-side. The jobs list is client state loaded by a
  // server action, so router.refresh cannot reach it — pages that hold their
  // own rows subscribe to this counter.
  const [jobWrites, setJobWrites] = useState(0);

  // Which writes have already been announced. Seeded from the persisted
  // transcript so a yesterday's add_job in initialMessages is not mistaken for
  // one that just landed; lazily, because the effect below runs per token and
  // the scan is not worth repeating.
  const announcedJobWritesRef = useRef<Set<string> | null>(null);
  if (announcedJobWritesRef.current === null) {
    announcedJobWritesRef.current = new Set(createdJobToolCallIds(initialMessages));
  }

  const chat = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      prepareSendMessagesRequest: ({ messages }) => ({
        body: { messages, pageContext: pageContextRef.current },
      }),
    }),
    // Without this the approval is resolved client-side and nothing ever
    // POSTs back to execute the tool. It is the mechanism, not a nicety.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onData: (part) => {
      if (part.type !== AGENT_NESTED_STREAM_PART_TYPE || !part.id) return;
      const id = part.id;
      const { delta } = part.data as AgentNestedStreamData;
      setToolStreams((prev) => ({ ...prev, [id]: (prev[id] ?? "") + delta }));
    },
    onFinish: ({ message, isAbort, isError }) => {
      // onFinish runs from a finally block, so it fires on abort too.
      if (isAbort || isError) return;

      const finishedParts = message?.parts ?? [];
      const wrote = createdJobToolCallIds(message ? [message] : []).length > 0;
      const finishedTools = finishedParts
        .filter((part) => isToolUIPart(part) && part.state === "output-available")
        .map((part) => getToolName(part as ToolUIPart));
      // Any nested tool that saves server-side leaves the page behind the
      // panel stale — the saved review card, the job's match score, or the
      // job's cover-letter button flipping to "Regenerate Letter".
      const generated = finishedTools.some(isNestedTool);
      // The score it just saved sits in a JOB row, which a jobs list holding
      // its own rows can only pick up from the counter. review_resume writes
      // to the resume and the list renders no cover-letter state, so neither
      // of the other two nested tools belongs here.
      const scored = finishedTools.includes("match_job");

      // The route stubs the paste on its way into the DB, but that copy is
      // not the one the client POSTs next turn — so without this the browser
      // keeps a consumed posting marked unconsumed, resolvePastedText finds
      // it one user message later, and the next thing the user types calls
      // add_job again on the job they just saved. It self-corrected only on
      // reload, when the stubbed row re-seeded the transcript.
      // Stays here rather than in the effect below: its deadline is the next
      // POST, and writing to useChat's store mid-stream risks being clobbered.
      if (wrote) chat.setMessages((prev) => stubConsumedPastes(prev));

      // Only the nested tools. A job write refreshes the moment add_job
      // returns — see the effect below. An RSC refresh on an irrelevant page
      // is a wasted request, not a bug; a stale saved review or match score
      // right after watching one land reads as one.
      if (generated) router.refresh();
      if (scored) setJobWrites((n) => n + 1);
    },
  });

  // add_job is approval-gated, so the model calls it on one POST and the SDK
  // executes it on the next — where stopWhen never matches (addJobSettled
  // wants a tool CALL in the step and that step has only a result), and the
  // model runs a whole extra generation narrating the write.
  // Announcing in onFinish left the jobs list stale for the length of that
  // generation; the output part is on the client the moment the tool returns.
  useEffect(() => {
    const announced = announcedJobWritesRef.current!;
    const landed = createdJobToolCallIds(chat.messages).filter(
      (id) => !announced.has(id),
    );
    if (landed.length === 0) return;
    landed.forEach((id) => announced.add(id));
    setJobWrites((n) => n + 1);
    router.refresh();
  }, [chat.messages, router]);

  const streamingRef = useRef(false);
  streamingRef.current =
    chat.status === "streaming" || chat.status === "submitted";

  // Every close path funnels through here — the X button, Escape, rail
  // eviction, and the Header trigger toggling it shut. That is what
  // guarantees nothing generates while the panel is closed.
  const close = useCallback(() => {
    if (streamingRef.current) {
      chat.stop();
      setInterruptedTurn(true);
      // The one abort the user gets no on-screen signal for — the panel they
      // would have read it in is the thing that just went away.
      toastInfo("Generation stopped. Reopen the assistant to continue.");
    }
    setIsOpen(false);
    releaseRail(AGENT_CHAT_PANEL_ID);
  }, [chat, releaseRail]);

  const runPreflight = useCallback(async () => {
    const settings = await getUserSettings();
    const ai = settings?.data?.settings?.ai;
    const provider = ai?.provider ?? AiProvider.OLLAMA;

    // No model configured is a configuration error, not a guess. Caught here
    // so the empty state says it and send is disabled — the user never
    // spends a turn to learn it, and the route's 503 stays the backstop.
    if (!ai?.model) {
      setPreflight({
        checked: true,
        ok: false,
        error:
          "No AI model is configured. Pick one in Settings to use the assistant.",
        provider,
      });
      return;
    }

    if (provider !== AiProvider.OLLAMA) {
      setPreflight({ checked: true, ok: true, provider, model: ai.model });
      return;
    }
    const result = await checkOllamaConnection(provider);
    setPreflight({
      checked: true,
      ok: result.isConnected,
      error: result.isConnected
        ? undefined
        : (result.error ?? "Ollama is not reachable."),
      provider,
      model: ai.model,
    });
  }, []);

  // Collapsing the rail buys the docked panel ~140px of page width.
  const open = useCallback(() => {
    collapseSidebar();
    requestOpen(AGENT_CHAT_PANEL_ID);
    setIsOpen(true);
    void runPreflight();
  }, [collapseSidebar, requestOpen, runPreflight]);

  // Losing the rail to another panel is a close, with the same abort.
  useEffect(() => {
    if (isOpen && holder !== AGENT_CHAT_PANEL_ID) close();
  }, [holder, isOpen, close]);

  // A signal, not a value: the composer's textarea is uncontrolled, so
  // remounting it on the nonce is the only thing that empties it.
  const [composerNonce, setComposerNonce] = useState(0);

  // At most one message waits here. A second send while one is already held
  // replaces it, which is what the composer did before this moved up.
  const [queued, setQueued] = useState<QueuedMessage | undefined>();

  // stop() before the delete is load-bearing: the route skips its onFinish
  // write when the turn was aborted, and that is what stops a late save from
  // restoring the conversation this just deleted.
  const clear = useCallback(async () => {
    const wasStreaming = streamingRef.current;
    chat.stop();
    await clearChatConversation();
    chat.setMessages([]);
    chat.clearError();
    setInterruptedTurn(false);
    setComposerNonce((n) => n + 1);
    setToolStreams({});
    setQueued(undefined);
    // Clearing an idle conversation aborted nothing worth reporting.
    if (wasStreaming) toastInfo("Conversation cleared and generation stopped.");
  }, [chat]);

  const approvalPending = useMemo(
    () => hasPendingApproval(chat.messages),
    [chat.messages],
  );

  // Resuming the turn is what ends the interruption — Continue, or simply
  // typing the next message. Cleared here rather than on a status transition
  // because close() flags the turn while stop() is still settling, and an
  // effect watching status would race it back to false.
  const dispatch = useCallback(
    (message: QueuedMessage) => {
      setInterruptedTurn(false);
      return chat.sendMessage(message);
    },
    [chat],
  );

  // Sending while a turn is in flight starts a SECOND request: useChat does
  // not abort the first, and the two live streams then take turns appending
  // copies of each other's message into one transcript — the same message.id
  // in two slots, which is the duplicate-key crash. Every sender funnels
  // through here, so the hold lives here and not in the composer, which the
  // resume page's Review button never touches.
  const sendMessage = useCallback(
    (message: QueuedMessage) => {
      if (streamingRef.current || approvalPending) {
        setQueued(message);
        return;
      }
      void dispatch(message);
    },
    [approvalPending, dispatch],
  );

  // A canned exchange, not a model turn: the caller supplies both halves and
  // nothing is POSTed. Persisted here because the transcript only reaches the
  // DB when the route runs, and a pair that vanishes on reload while every
  // real turn survives reads as a bug.
  const seedExchange = useCallback(
    (userText: string, assistantText: string) => {
      const next: UIMessage[] = [
        ...chat.messages,
        {
          id: generateId(),
          role: "user",
          parts: [{ type: "text", text: userText }],
        },
        {
          id: generateId(),
          role: "assistant",
          parts: [{ type: "text", text: assistantText }],
        },
      ];
      chat.setMessages(next);
      void saveChatConversation(next);
    },
    [chat],
  );

  // Both conditions are load-bearing. approvalPending flips false at the same
  // instant sendAutomaticallyWhen fires the POST that executes the approved
  // tool, so releasing on that alone would race it and cut the tool off
  // mid-execution; status is what proves the connection is actually free.
  useEffect(() => {
    if (!queued || approvalPending || chat.status !== "ready") return;
    setQueued(undefined);
    void dispatch(queued);
  }, [queued, approvalPending, chat.status, dispatch]);

  const regenerate = useCallback(() => {
    if (streamingRef.current) return;
    setInterruptedTurn(false);
    void chat.regenerate();
  }, [chat]);

  const clearQueued = useCallback(() => setQueued(undefined), []);

  const dismissInterrupted = useCallback(() => setInterruptedTurn(false), []);

  // A turn in flight, or one parked on an approval. Read by every surface
  // that starts a chat from outside the panel, so a second one cannot clear
  // the conversation the first is still streaming into.
  const busy = streamingRef.current || approvalPending;

  return {
    isOpen,
    open,
    close,
    busy,
    messages: chat.messages,
    toolStreams,
    jobWrites,
    status: chat.status,
    error: chat.error,
    clearError: chat.clearError,
    sendMessage,
    seedExchange,
    stop: chat.stop,
    regenerate,
    addToolApprovalResponse: chat.addToolApprovalResponse,
    approvalPending,
    queued,
    clearQueued,
    interruptedTurn,
    dismissInterrupted,
    clear,
    preflight,
    refreshPreflight: runPreflight,
    composerNonce,
    panelWidth,
    startResize,
    isResizing,
    isPanelExpanded,
    togglePanelExpand,
  };
}

export function AgentChatProvider({
  initialMessages,
  children,
}: {
  initialMessages: UIMessage[];
  children: React.ReactNode;
}) {
  const value = useAgentChatValue(initialMessages);
  return (
    <AgentChatContext.Provider value={value}>
      {children}
    </AgentChatContext.Provider>
  );
}

export function useAgentChat() {
  const ctx = useContext(AgentChatContext);
  if (!ctx) {
    throw new Error("useAgentChat must be used within an AgentChatProvider");
  }
  return ctx;
}
