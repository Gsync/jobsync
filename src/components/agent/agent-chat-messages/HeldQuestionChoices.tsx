import { SAVE_AS_NEW, SKIP } from "@/lib/questions/choices";
import {
  hasCapabilities,
  targetChoices,
  type HeldItem,
  type HeldOutcome,
} from "@/components/agent/agent-chat-messages/heldQuestions";

const quoted = (text: string) => `“${text}”`;

function HeldEntry({ held, changed }: { held: HeldItem; changed: ReadonlySet<string> }) {
  const question = quoted(held.question);
  if (!hasCapabilities(held)) {
    return <li>{`${question}: tell me what you'd like to do with it.`}</li>;
  }
  if (held.status === "exists") {
    const choices = [...targetChoices(held.existing, changed), SKIP];
    return <li>{`${question} is already in your bank: ${choices.join(", ")}.`}</li>;
  }
  if (!held.hasIncomingAnswer) {
    const matches = held.candidates.map((c) => quoted(c.question)).join(", ");
    return <li>{`${question} looks like ${matches}: ${SAVE_AS_NEW} or ${SKIP}.`}</li>;
  }
  return (
    <li>
      {`${question} looks like a saved question:`}
      <ul className="ml-3 mt-0.5 space-y-0.5">
        {held.candidates.map((c) => (
          <li key={c.id}>{`${quoted(c.question)}: ${targetChoices(c, changed).join(", ")}`}</li>
        ))}
      </ul>
      {`Or ${SAVE_AS_NEW}, or ${SKIP}.`}
    </li>
  );
}

// Shown in the transcript only: it starts no model turn and writes nothing
export function HeldQuestionChoices({ outcome }: { outcome: HeldOutcome }) {
  return (
    <div
      role="note"
      aria-label="Questions waiting on your reply"
      className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
    >
      <p>Not saved yet. Reply with what you&apos;d like to do:</p>
      <ul className="mt-1 space-y-1">
        {outcome.waiting.map((held) => (
          <HeldEntry key={held.question} held={held} changed={outcome.changed} />
        ))}
      </ul>
    </div>
  );
}
