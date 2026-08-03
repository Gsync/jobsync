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
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from "ai";
import { hasPendingApproval } from "@/lib/agent/paste";
import { useRightRail } from "@/context/RightRailContext";
import { clearChatConversation } from "@/actions/agentChat.actions";
import { getUserSettings } from "@/actions/userSettings.actions";
import { checkOllamaConnection } from "@/utils/ai.utils";
import { AiProvider } from "@/models/ai.model";
import type { AgentAddJobResult, PageContext } from "@/models/agent.model";

export const AGENT_CHAT_PANEL_ID = "chat";

type Preflight = { checked: boolean; ok: boolean; error?: string };

type AgentChatValue = ReturnType<typeof useAgentChatValue>;

const AgentChatContext = createContext<AgentChatValue | null>(null);

function useAgentChatValue(initialMessages: UIMessage[]) {
  const router = useRouter();
  const pathname = usePathname();
  const { holder, requestOpen, close: releaseRail } = useRightRail();

  const [isOpen, setIsOpen] = useState(false);
  const [interruptedTurn, setInterruptedTurn] = useState(false);
  const [preflight, setPreflight] = useState<Preflight>({
    checked: false,
    ok: true,
  });

  const pageContextRef = useRef<PageContext>({ route: pathname });
  useEffect(() => {
    pageContextRef.current = { route: pathname };
  }, [pathname]);

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
    onFinish: ({ message }) => {
      const wrote = (message?.parts ?? []).some((part) => {
        if (!isToolUIPart(part) || part.state !== "output-available")
          return false;
        return (part.output as AgentAddJobResult | undefined)?.created === true;
      });
      // Unconditional: an RSC refresh on an irrelevant page is a wasted
      // request, not a bug. A stale jobs list behind the panel right after
      // watching a job get created reads as one.
      if (wrote) router.refresh();
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
      });
      return;
    }

    if (provider !== AiProvider.OLLAMA) {
      setPreflight({ checked: true, ok: true });
      return;
    }
    const result = await checkOllamaConnection(provider);
    setPreflight({
      checked: true,
      ok: result.isConnected,
      error: result.isConnected
        ? undefined
        : (result.error ?? "Ollama is not reachable."),
    });
  }, []);

  const open = useCallback(() => {
    requestOpen(AGENT_CHAT_PANEL_ID);
    setIsOpen(true);
    void runPreflight();
  }, [requestOpen, runPreflight]);

  // Losing the rail to another panel is a close, with the same abort.
  useEffect(() => {
    if (isOpen && holder !== AGENT_CHAT_PANEL_ID) close();
  }, [holder, isOpen, close]);

  // Order matters: a late onFinish would otherwise write the conversation
  // back after the delete.
  const clear = useCallback(async () => {
    chat.stop();
    await clearChatConversation();
    chat.setMessages([]);
    chat.clearError();
    setInterruptedTurn(false);
  }, [chat]);

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
    status: chat.status,
    error: chat.error,
    clearError: chat.clearError,
    sendMessage: chat.sendMessage,
    stop: chat.stop,
    regenerate: chat.regenerate,
    addToolApprovalResponse: chat.addToolApprovalResponse,
    approvalPending,
    interruptedTurn,
    dismissInterrupted,
    clear,
    preflight,
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
