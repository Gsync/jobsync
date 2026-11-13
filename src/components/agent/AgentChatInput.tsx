"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveToLocalStorage } from "@/utils/localstorage.utils";
import { XIcon } from "lucide-react";
import type { TextUIPart, UIMessage } from "ai";
import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  Attachments,
  type AttachmentData,
} from "@/components/ai-elements/attachments";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAgentChat } from "@/components/agent/AgentChatProvider";
import { APP_CONSTANTS } from "@/lib/constants";
import {
  AGENT_PASTE_PART_TYPE,
  isAgentPastePart,
  type AgentPastePart,
  type AgentPastePartData,
} from "@/models/agent.model";

type ComposerPart = TextUIPart | AgentPastePart;

// A prompt is text plus at most one paste chip, so history has to keep both:
// restoring only the textarea would silently drop the posting the user pasted.
type PromptHistoryEntry = { text: string; chip?: AgentPastePartData };

// Old entries hold whole postings, so keep the stack bounded. Fifty matches
// the conversation transcript's own storage ceiling.
const PROMPT_HISTORY_LIMIT = 50;

function chipLabel(chip: AgentPastePartData): string {
  const chars = chip.chars.toLocaleString();
  return chip.truncated
    ? `Pasted posting · ${chars} chars (truncated)`
    : `Pasted posting · ${chars} chars`;
}

// Synthesized at render time only. The wire format stays the custom data part:
// a real FileUIPart is a standard type, so convertToModelMessages would carry
// the whole posting to the model and defeat head truncation.
function chipAttachment(chip: AgentPastePartData): AttachmentData {
  return {
    type: "file",
    id: chip.id,
    mediaType: "text/plain",
    filename: chipLabel(chip),
    url: "",
  };
}

// crypto.randomUUID is secure-context-only, so it is absent over plain http on
// a LAN host and calling it drops the paste. The id only has to be unique
// within one composer, never unguessable.
function chipId(): string {
  return (
    crypto.randomUUID?.() ??
    `paste-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  );
}

function queuedText(parts: UIMessage["parts"]): string {
  const text = parts.find((part) => part.type === "text");
  const chip = parts.find(isAgentPastePart);
  if (text?.type === "text" && text.text) return text.text;
  return chip ? chipLabel(chip.data) : "";
}

export function AgentChatInput() {
  const {
    sendMessage,
    stop,
    status,
    approvalPending,
    queued,
    clearQueued,
    error,
    clearError,
    preflight,
    composerNonce,
    clear: clearChat,
  } = useAgentChat();

  const [text, setText] = useState("");
  const [chip, setChip] = useState<AgentPastePartData | undefined>();

  // Sent prompts, oldest first. `historyIndex` is null while editing the draft;
  // otherwise it points at the recalled entry. The draft is parked here so
  // ArrowDown can bring back whatever the user was typing before ArrowUp.
  const [history, setHistory] = useState<PromptHistoryEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(
        APP_CONSTANTS.AGENT_CHAT_PROMPT_HISTORY_STORAGE_KEY,
      );
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (entry): entry is PromptHistoryEntry =>
            !!entry && typeof entry === "object" && typeof entry.text === "string",
        )
        .slice(-PROMPT_HISTORY_LIMIT);
    } catch {
      return [];
    }
  });
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const draftRef = useRef<PromptHistoryEntry>({ text: "" });

  const restorePrompt = useCallback((entry: PromptHistoryEntry) => {
    setText(entry.text);
    setChip(entry.chip);
  }, []);

  // Persist the prompt stack so ArrowUp survives a reload or a remount after an
  // error instead of dropping the only copy of a pasted posting.
  useEffect(() => {
    try {
      saveToLocalStorage(APP_CONSTANTS.AGENT_CHAT_PROMPT_HISTORY_STORAGE_KEY, history);
    } catch {
      // localStorage may be unavailable (private mode, SSR) — in-memory only.
    }
  }, [history]);

  // ArrowUp starts history only from the very start of a draft, so normal
  // multiline caret movement still works. Once an entry is recalled, arrows
  // keep walking the stack until the user types and turns it back into a draft.
  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd+C with no selection clears the chat window (terminal-style),
    // instead of copying an empty selection. A real selection still copies.
    if (
      (event.ctrlKey || event.metaKey) &&
      (event.key === "c" || event.key === "C")
    ) {
      const textarea = event.currentTarget;
      if (textarea.selectionStart === textarea.selectionEnd) {
        event.preventDefault();
        void clearChat?.();
      }
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    if (
      event.shiftKey ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    const textarea = event.currentTarget;
    const browsing = historyIndex !== null;
    if (event.key === "ArrowUp") {
      if (
        !browsing &&
        (textarea.selectionStart !== 0 || textarea.selectionEnd !== 0)
      ) {
        return;
      }
      if (!browsing) {
        if (history.length === 0) return;
        draftRef.current = { text, chip };
        const nextIndex = history.length - 1;
        event.preventDefault();
        setHistoryIndex(nextIndex);
        restorePrompt(history[nextIndex]);
        return;
      }
      if (historyIndex === 0) return;
      event.preventDefault();
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      restorePrompt(history[nextIndex]);
      return;
    }

    if (!browsing) return;

    event.preventDefault();
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      restorePrompt(history[nextIndex]);
    } else {
      setHistoryIndex(null);
      restorePrompt(draftRef.current);
    }
  };

  const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = event.clipboardData.getData("text/plain");
    if (pasted.length < APP_CONSTANTS.AGENT_CHAT_PASTE_THRESHOLD) return;
    event.preventDefault();
    setHistoryIndex(null);
    const truncated = pasted.length > APP_CONSTANTS.AGENT_CHAT_PASTE_MAX_CHARS;
    // The ceiling is enforced here, at chip creation, so nothing beyond it
    // ever enters `messages` or the conversation row.
    const body = truncated
      ? pasted.slice(0, APP_CONSTANTS.AGENT_CHAT_PASTE_MAX_CHARS)
      : pasted;
    setChip({
      id: chipId(),
      text: body,
      chars: body.length,
      truncated,
    });
  };

  const submit = (submitted: string) => {
    const trimmed = submitted.trim();
    const parts: ComposerPart[] = [
      ...(trimmed ? [{ type: "text" as const, text: trimmed }] : []),
      ...(chip
        ? [
            {
              type: AGENT_PASTE_PART_TYPE,
              id: chip.id,
              data: chip,
            } satisfies AgentPastePart,
          ]
        : []),
    ];
    if (parts.length === 0) return;
    // Remember it before clearing: if the send fails, ArrowUp is the only copy
    // left of a pasted posting that never reached the transcript.
    const entry: PromptHistoryEntry = { text: trimmed, chip };
    setHistory((previous) =>
      [...previous, entry].slice(-PROMPT_HISTORY_LIMIT),
    );
    setHistoryIndex(null);
    draftRef.current = { text: "" };
    // Unconditional. Whether this goes out now or waits — for an approval, or
    // for the reply already streaming — is the provider's call, because it is
    // the only place that sees every sender.
    sendMessage({ parts });
    setText("");
    setChip(undefined);
  };

  // Clearing the conversation clears the composer with it. The textarea empties
  // by remounting on the same nonce below — nothing else resets it.
  useEffect(() => {
    if (!composerNonce) return;
    setText("");
    setChip(undefined);
    setHistory([]);
    setHistoryIndex(null);
    draftRef.current = { text: "" };
  }, [composerNonce]);

  const onStop = useCallback(() => {
    void stop();
  }, [stop]);

  const isGenerating = status === "submitted" || status === "streaming";
  const canSend = preflight.ok && (text.trim().length > 0 || !!chip);

  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <Alert variant="destructive" className="flex items-start gap-2">
          <AlertDescription className="flex-1">
            {error.message}
          </AlertDescription>
          <Button
            aria-label="Dismiss error"
            className="size-6 shrink-0"
            onClick={clearError}
            size="icon"
            type="button"
            variant="ghost"
          >
            <XIcon className="size-3.5" />
          </Button>
        </Alert>
      ) : null}

      {queued ? (
        <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-2 text-sm">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">
              {approvalPending
                ? "Queued — waiting on your approval above"
                : "Queued — sends when the current reply finishes"}
            </p>
            <p className="truncate">{queuedText(queued.parts)}</p>
          </div>
          <Button
            aria-label="Remove from queue"
            className="size-6 shrink-0"
            onClick={clearQueued}
            size="icon"
            type="button"
            variant="ghost"
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      ) : null}

      {preflight.checked && !preflight.ok && preflight.error ? (
        <p className="text-xs text-destructive">{preflight.error}</p>
      ) : null}

      {/* No PromptInputBody: it wraps these in a display:contents div, and
          InputGroup only stacks vertically via has-[>[data-align=block-end]],
          a DOM-child selector that wrapper defeats. Nested, the group stays a
          row and the textarea collapses to a ~24px sliver beside the footer. */}
      <PromptInput onSubmit={(message) => submit(message.text)}>
        {chip ? (
          <PromptInputHeader>
            <Attachments variant="inline">
              <Attachment data={chipAttachment(chip)}>
                <AttachmentPreview />
                <AttachmentInfo />
                {/* Not AttachmentRemove: it repeats its label in an sr-only
                    span, so the chip's wording would appear twice. */}
                <Button
                  aria-label="Remove pasted content"
                  className="size-5 shrink-0 rounded p-0 [&_svg]:size-2.5"
                  onClick={() => {
                    setChip(undefined);
                    setHistoryIndex(null);
                  }}
                  type="button"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              </Attachment>
            </Attachments>
          </PromptInputHeader>
        ) : null}
        {/* Controlled so history recall can put text back into the textarea.
            PromptInput still reads the DOM value through FormData on submit. */}
        <PromptInputTextarea
          className="min-h-9"
          key={composerNonce}
          onChange={(event) => {
            setText(event.currentTarget.value);
            // Typing turns a recalled prompt back into a draft.
            setHistoryIndex(null);
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder="Ask or paste a job posting…"
          value={text}
        />
        <PromptInputFooter>
          <span className="text-xs text-muted-foreground">
            {approvalPending && !queued ? "Waiting on your approval above" : ""}
          </span>
          <PromptInputSubmit
            aria-label={isGenerating ? "Stop response" : "Send"}
            disabled={!isGenerating && !canSend}
            className="[&_svg]:size-3.5"
            onStop={onStop}
            size="icon-xs"
            status={status}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
