import "server-only";

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  hasToolCall,
  isToolUIPart,
  stepCountIs,
  streamText,
  type LanguageModelUsage,
  type StopCondition,
  type UIMessage,
} from "ai";
import { getModel, type ProviderType } from "@/lib/ai/providers";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import { TEMPERATURES } from "@/lib/ai/config";
import { APP_CONSTANTS } from "@/lib/constants";
import { AgentChatRequestSchema } from "@/models/agent.schema";
import {
  AGENT_CHAT_SYSTEM_PROMPT,
  buildPageContextMessage,
  buildPasteContextMessage,
} from "@/lib/agent/prompt";
import {
  resolvePastedText,
  stubConsumedPastes,
  windowMessages,
} from "@/lib/agent/paste";
import { truncateForModel } from "@/lib/agent/paste.server";
import { buildAgentTools } from "@/lib/agent/tools";
import { measureTurnPrefix, type TurnPrefixMetrics } from "@/lib/agent/turnMetrics";
import { mapAgentError } from "@/lib/agent/errors";
import { getUserSettings } from "@/actions/userSettings.actions";
import { saveChatConversation } from "@/actions/agentChat.actions";
import { AiProvider } from "@/models/ai.model";
import {
  genAiRequestAttrs,
  genAiResponseAttrs,
  runInSpan,
  startSpan,
  SURFACES,
} from "@/lib/telemetry";
import { addJobSettled, AGENT_CHAT_TERMINAL_TOOLS } from "@/models/agent.model";

// The one terminal tool whose stop condition is not "was it called" — see
// addJobSettled.
const addJobSettledStop: StopCondition<any> = ({ steps }) =>
  addJobSettled(steps[steps.length - 1] ?? {});

// One structured line per turn. Sizes and outcomes only — never the pasted
// posting and never the extracted arguments.
function logTurn(fields: Record<string, unknown>) {
  console.info("[agent-chat]", JSON.stringify(fields));
}

function outcomeOf(message: UIMessage | undefined): {
  tool: string | null;
  state: string | null;
  outcome: string;
} {
  for (const part of message?.parts ?? []) {
    if (!isToolUIPart(part)) continue;
    const tool = part.type.replace(/^tool-/, "");
    if (part.state !== "output-available") {
      return { tool, state: part.state, outcome: part.state };
    }
    const output = part.output as
      | { status?: string; created?: boolean; validationError?: string }
      | undefined;
    // Discriminated on shape, not on tool name: a name allowlist logged a
    // resume read as "duplicate" once already. Status-carrying results report
    // their own outcome, and add_job is the only shape without a status field,
    // so it is the fallback rather than the default.
    if (typeof output?.status === "string") {
      return { tool, state: part.state, outcome: output.status };
    }
    const outcome = output?.validationError
      ? "validation"
      : output?.created
        ? "created"
        : "duplicate";
    return { tool, state: part.state, outcome };
  }
  return { tool: null, state: null, outcome: "none" };
}

export const POST = async (req: NextRequest) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!session || !userId) {
    return NextResponse.json({ error: "Not Authenticated" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(userId, "chat");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.` },
      { status: 429 },
    );
  }

  const parsed = AgentChatRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid chat request." }, { status: 400 });
  }

  const messages = parsed.data.messages as UIMessage[];
  const { pageContext } = parsed.data;

  // Write-on-receipt. The user's message and the posting they pasted are the
  // expensive half to reproduce, so they are durable before the model is
  // called — a reload, an error or a stop() mid-stream cannot lose them.
  await saveChatConversation(messages);

  const settings = await getUserSettings();
  const ai = settings?.data?.settings?.ai;
  // provider is always present — defaultUserSettings supplies it. model is
  // not, and it is NOT substituted: picking a model the user never chose
  // turns a knowable configuration error into a mid-stream "model not
  // found" naming something they never configured.
  const provider = (ai?.provider ?? AiProvider.OLLAMA) as ProviderType;
  const modelName = ai?.model;
  if (!modelName) {
    return NextResponse.json(
      { error: "No AI model is configured. Pick one in Settings to use the assistant." },
      { status: 503 },
    );
  }
  const errorContext = { provider, model: modelName };

  let model;
  try {
    model = await getModel(provider, modelName, userId);
  } catch (error) {
    return NextResponse.json({ error: mapAgentError(error, errorContext) }, { status: 503 });
  }

  const pastedText = resolvePastedText(messages);

  // Async in ai@6 (correction #5), and the messages array is client-supplied
  // — a shape z.array(z.any()) let through can reject the conversion, and
  // that is a bad request, not a server crash.
  const windowed = windowMessages(messages);

  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(windowed);
  } catch {
    return NextResponse.json({ error: "Invalid chat request." }, { status: 400 });
  }

  // A chip-only send — paste, then Send without typing — has no text part,
  // and the paste part is not a model part, so the message converts to empty
  // content. Ollama rejects the whole request on it (its content field is a
  // string; the provider serializes empty content as []), and it keeps doing
  // so on every later turn while the shell stays in the window. The paste
  // context message below is what actually carries the posting.
  modelMessages = modelMessages.filter(
    (message) => !(Array.isArray(message.content) && message.content.length === 0),
  );

  // Injected only on the turn that introduced the paste. On the approval POST
  // the last message is the assistant's, so nothing is re-injected — and the
  // full text never reaches the model on any turn.
  const lastIsUser = messages[messages.length - 1]?.role === "user";
  // Whether a job is open is a per-turn fact, but a no_job tool result sits
  // in history looking permanent — the model replayed one for two turns.
  // Recency is what has to beat it, so this rides at the end of the messages
  // rather than in the system prompt. A pasted posting still lands last.
  if (lastIsUser) {
    modelMessages.push({ role: "user", content: buildPageContextMessage(pageContext) });
  }
  if (pastedText && lastIsUser) {
    const { block } = truncateForModel(pastedText);
    modelMessages.push({ role: "user", content: buildPasteContextMessage(block) });
  }

  // req.signal is what makes stop()/Clear/close actually stop generating: the
  // client aborting its fetch is otherwise invisible here, and streamText would
  // keep pulling tokens until the deadline. Tools inherit this via execute's
  // abortSignal, so a nested generation is cancelled too.
  const turnSignal = AbortSignal.any([
    req.signal,
    AbortSignal.timeout(APP_CONSTANTS.AGENT_CHAT_TIMEOUT_MS),
  ]);

  // Written inside execute, read in onFinish, which runs after it.
  let prefixMetrics: TurnPrefixMetrics | undefined;

  // Written by streamText's own onFinish, read in the outer onFinish. Must be
  // totalUsage, not one step's usage: stopWhen permits AGENT_CHAT_MAX_STEPS.
  let turnUsage: LanguageModelUsage | undefined;
  let turnFinishReason: string | undefined;

  const turnSpan = startSpan("agent.chat.turn", {
    ...genAiRequestAttrs({
      provider,
      model: modelName,
      temperature: TEMPERATURES.ANALYSIS,
      numCtx: APP_CONSTANTS.AGENT_CHAT_NUM_CTX,
      surface: SURFACES.AGENT_CHAT,
      system: AGENT_CHAT_SYSTEM_PROMPT,
      prompt: modelMessages,
    }),
    "jobsync.user_id": userId,
  });

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: ({ writer }) =>
      runInSpan(turnSpan, () => {
        const tools = buildAgentTools({
          userId,
          pastedText,
          pageContext,
          model,
          provider,
          modelName,
          writer,
        });
        prefixMetrics = measureTurnPrefix({
          userId,
          system: AGENT_CHAT_SYSTEM_PROMPT,
          tools,
          modelMessages,
        });
        const result = streamText({
          model,
          system: AGENT_CHAT_SYSTEM_PROMPT,
          messages: modelMessages,
          tools,
          // Which tools end the turn — and why — lives beside the tool metadata
          // in agent.model.ts, where a new tool is registered.
          stopWhen: [
            stepCountIs(APP_CONSTANTS.AGENT_CHAT_MAX_STEPS),
            ...AGENT_CHAT_TERMINAL_TOOLS.map((name) =>
              name === "add_job" ? addJobSettledStop : hasToolCall(name),
            ),
          ],
          // Argument extraction wants determinism.
          temperature: TEMPERATURES.ANALYSIS,
          abortSignal: turnSignal,
          providerOptions: {
            // qwen3.5 is a hybrid-reasoning model and the provider defaults
            // think to false. With the thinking channel shut it deliberates in
            // the content channel, and content and a tool call are mutually
            // exclusive — add_job measured 1/7 with it off, 7/7 with it on.
            ollama: { think: true, options: { num_ctx: APP_CONSTANTS.AGENT_CHAT_NUM_CTX } },
          },
          // streamText's onFinish, not createUIMessageStream's: result is
          // scoped inside execute while the span ends in the outer onFinish.
          onFinish: ({ totalUsage, finishReason }) => {
            turnUsage = totalUsage;
            turnFinishReason = finishReason;
          },
        });
        // createUIMessageStream emits no start/finish of its own — the merged
        // stream carries them, so this is byte-identical to the old response.
        writer.merge(result.toUIMessageStream());
      }),
    onFinish: async ({ messages: finalMessages, responseMessage, isAborted }) => {
      const { tool, state, outcome } = outcomeOf(responseMessage);
      const fields = {
        provider,
        model: modelName,
        tool,
        toolState: state,
        outcome,
        aborted: isAborted,
        pasteChars: pastedText?.length ?? 0,
        messageCount: finalMessages.length,
        // Windowing is invisible to the user, so this is the only signal that
        // the model was given less history than the transcript holds.
        historyDropped: messages.length - windowed.length,
        // What was actually sent. prefixChanged is the cache signal: the
        // system prompt and tool material must stay byte-identical within a
        // conversation or Ollama recomputes the whole prefix.
        systemChars: prefixMetrics?.systemChars ?? 0,
        toolChars: prefixMetrics?.toolChars ?? 0,
        messageChars: prefixMetrics?.messageChars ?? 0,
        prefixChanged: prefixMetrics?.prefixChanged ?? false,
      };
      logTurn(fields);
      // The same curated field set, on the span rather than only in the log,
      // so it is queryable beside latency, tokens and the tool waterfall.
      turnSpan.end({
        ...genAiResponseAttrs({
          usage: turnUsage,
          finishReason: turnFinishReason,
        }),
        "jobsync.tool": fields.tool,
        "jobsync.tool_state": fields.toolState,
        "jobsync.outcome": fields.outcome,
        "jobsync.aborted": fields.aborted,
        "jobsync.paste_chars": fields.pasteChars,
        "jobsync.message_count": fields.messageCount,
        "jobsync.history_dropped": fields.historyDropped,
        "jobsync.system_chars": fields.systemChars,
        "jobsync.tool_chars": fields.toolChars,
        "jobsync.message_chars": fields.messageChars,
        "jobsync.prefix_changed": fields.prefixChanged,
      });
      // A cancelled turn never writes back. Clear deletes the conversation and
      // this fires afterwards on the stream's cancel path, so saving here would
      // restore exactly what the user just deleted. The write-on-receipt above
      // already made their message durable, and an incomplete review is not
      // worth persisting.
      if (isAborted) return;
      // Stubbing happens here so it lives in exactly one place.
      await saveChatConversation(stubConsumedPastes(finalMessages));
    },
    // NOTE: this signature takes the error directly, unlike streamText's
    // onError which takes { error }.
    onError: (error) => mapAgentError(error, errorContext),
  });

  return createUIMessageStreamResponse({ stream });
};
