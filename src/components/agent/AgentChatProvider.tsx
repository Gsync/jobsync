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
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from "ai";
import { hasPendingApproval } from "@/lib/agent/paste";
import { useRightRail } from "@/context/RightRailContext";
import { useSidebar } from "@/context/SidebarContext";
import { useResizablePanel } from "@/hooks/useResizablePanel";
import { APP_CONSTANTS } from "@/lib/constants";
import { toastInfo } from "@/lib/toast";
import { clearChatConversation } from "@/actions/agentChat.actions";
import { getUserSettings } from "@/actions/userSettings.actions";
import { checkOllamaConnection } from "@/utils/ai.utils";
import { AiProvider } from "@/models/ai.model";
import {
  AGENT_REVIEW_PART_TYPE,
  type AgentAddJobResult,
  type AgentReviewStreamData,
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

type AgentChatValue = ReturnType<typeof useAgentChatValue>;

const AgentChatContext = createContext<AgentChatValue | null>(null);

// The only route that identifies a resource the chat can read. Derived from
// the pathname rather than plumbed through props so no page has to know the
// panel exists.
const RESUME_ROUTE = /^\/dashboard\/profile\/resume\/([^/]+)$/;

export function pageContextFor(pathname: string): PageContext {
  const resumeId = pathname.match(RESUME_ROUTE)?.[1];
  return resumeId ? { route: pathname, resumeId } : { route: pathname };
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
  // onData and drops them — so the review's streaming text lives here, keyed
  // by toolCallId so two reviews in one conversation cannot collide.
  const [reviewStreams, setReviewStreams] = useState<Record<string, string>>({});

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
      if (part.type !== AGENT_REVIEW_PART_TYPE || !part.id) return;
      const id = part.id;
      const { delta } = part.data as AgentReviewStreamData;
      setReviewStreams((prev) => ({ ...prev, [id]: (prev[id] ?? "") + delta }));
    },
    onFinish: ({ message, isAbort, isError }) => {
      // onFinish runs from a finally block, so it fires on abort too.
      if (isAbort || isError) return;

      const finishedParts = message?.parts ?? [];
      const wrote = finishedParts.some((part) => {
        if (!isToolUIPart(part) || part.state !== "output-available") return false;
        return (part.output as AgentAddJobResult | undefined)?.created === true;
      });
      const reviewed = finishedParts.some((part) => {
        if (!isToolUIPart(part) || part.state !== "output-available") return false;
        return getToolName(part) === "review_resume";
      });

      // Unconditional: an RSC refresh on an irrelevant page is a wasted
      // request, not a bug. A stale jobs list or a stale saved review behind
      // the panel right after watching one land reads as one.
      if (wrote || reviewed) router.refresh();
    },
  });

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
    setReviewStreams({});
    // Clearing an idle conversation aborted nothing worth reporting.
    if (wasStreaming) toastInfo("Conversation cleared and generation stopped.");
  }, [chat]);

  // Resuming the turn is what ends the interruption — Continue, or simply
  // typing the next message. Cleared here rather than on a status transition
  // because close() flags the turn while stop() is still settling, and an
  // effect watching status would race it back to false.
  const regenerate = useCallback<typeof chat.regenerate>(
    (...args) => {
      setInterruptedTurn(false);
      return chat.regenerate(...args);
    },
    [chat],
  );

  const sendMessage = useCallback<typeof chat.sendMessage>(
    (...args) => {
      setInterruptedTurn(false);
      return chat.sendMessage(...args);
    },
    [chat],
  );

  const approvalPending = useMemo(
    () => hasPendingApproval(chat.messages),
    [chat.messages],
  );

  const dismissInterrupted = useCallback(() => setInterruptedTurn(false), []);

  return {
    isOpen,
    open,
    close,
    messages: chat.messages,
    reviewStreams,
    status: chat.status,
    error: chat.error,
    clearError: chat.clearError,
    sendMessage,
    stop: chat.stop,
    regenerate,
    addToolApprovalResponse: chat.addToolApprovalResponse,
    approvalPending,
    interruptedTurn,
    dismissInterrupted,
    clear,
    preflight,
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
