"use client";

import { useCallback, useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import type { TextUIPart } from "ai";
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

function queuedText(parts: ComposerPart[]): string {
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
    error,
    clearError,
    preflight,
    prefill,
    composerNonce,
  } = useAgentChat();

  const [text, setText] = useState("");
  const [chip, setChip] = useState<AgentPastePartData | undefined>();
  const [queued, setQueued] = useState<ComposerPart[] | undefined>();

  const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = event.clipboardData.getData("text/plain");
    if (pasted.length < APP_CONSTANTS.AGENT_CHAT_PASTE_THRESHOLD) return;
    event.preventDefault();
    const truncated = pasted.length > APP_CONSTANTS.AGENT_CHAT_PASTE_MAX_CHARS;
    // The ceiling is enforced here, at chip creation, so nothing beyond it
    // ever enters `messages` or the conversation row.
    const body = truncated
      ? pasted.slice(0, APP_CONSTANTS.AGENT_CHAT_PASTE_MAX_CHARS)
      : pasted;
    setChip({
      id: crypto.randomUUID(),
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
    if (approvalPending) {
      setQueued(parts); // client-only, never persisted
    } else {
      sendMessage({ parts });
    }
    setText("");
    setChip(undefined);
  };

  // Dispatches once the approval resolves AND the follow-up POST that executes
  // the approved tool has finished. approvalPending flips false at the same
  // instant sendAutomaticallyWhen fires that POST — dispatching on that render
  // would race it, and if sendMessage interrupts the in-flight stream, the
  // approved tool can be cut off mid-execution server-side.
  useEffect(() => {
    if (!approvalPending && status === "ready" && queued) {
      sendMessage({ parts: queued });
      setQueued(undefined);
    }
  }, [approvalPending, status, queued, sendMessage]);

  // The remounted textarea carries the prefill; `text` has to catch up or
  // send stays disabled until the user types a character.
  useEffect(() => {
    if (prefill) setText(prefill.text);
  }, [prefill]);

  // Clearing the conversation clears the composer with it. The textarea empties
  // by remounting on the same nonce below — nothing else resets it.
  useEffect(() => {
    if (!composerNonce) return;
    setText("");
    setChip(undefined);
    setQueued(undefined);
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
              Queued — waiting on your approval above
            </p>
            <p className="truncate">{queuedText(queued)}</p>
          </div>
          <Button
            aria-label="Remove from queue"
            className="size-6 shrink-0"
            onClick={() => setQueued(undefined)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      ) : null}

      {preflight.checked && !preflight.ok && preflight.error ? (
        <p className="text-xs text-muted-foreground">{preflight.error}</p>
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
                  onClick={() => setChip(undefined)}
                  type="button"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              </Attachment>
            </Attachments>
          </PromptInputHeader>
        ) : null}
        {/* Uncontrolled: PromptInput reads the textarea through FormData and
            resets it on submit. `text` mirrors it only to enable send. */}
        <PromptInputTextarea
          defaultValue={prefill?.text}
          key={prefill?.nonce ?? composerNonce}
          onChange={(event) => setText(event.currentTarget.value)}
          onPaste={onPaste}
          placeholder="Ask or paste a job posting…"
        />
        <PromptInputFooter>
          <span className="text-xs text-muted-foreground">
            {approvalPending && !queued ? "Waiting on your approval above" : ""}
          </span>
          <PromptInputSubmit
            aria-label={isGenerating ? "Stop response" : "Send"}
            disabled={!isGenerating && !canSend}
            onStop={onStop}
            status={status}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
