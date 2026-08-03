import "server-only";

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import {
  convertToModelMessages,
  hasToolCall,
  isToolUIPart,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { getModel, type ProviderType } from "@/lib/ai/providers";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import { TEMPERATURES } from "@/lib/ai/config";
import { APP_CONSTANTS } from "@/lib/constants";
import { AgentChatRequestSchema } from "@/models/agent.schema";
import { AGENT_CHAT_SYSTEM_PROMPT, buildPasteContextMessage } from "@/lib/agent/prompt";
import {
  resolvePastedText,
  stubConsumedPastes,
  windowMessages,
} from "@/lib/agent/paste";
import { truncateForModel } from "@/lib/agent/paste.server";
import { buildAgentTools } from "@/lib/agent/tools";
import { mapAgentError } from "@/lib/agent/errors";
import { getUserSettings } from "@/actions/userSettings.actions";
import { saveChatConversation } from "@/actions/agentChat.actions";
import { AiProvider } from "@/models/ai.model";
import type { AgentAddJobResult } from "@/models/agent.model";

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
    const output = part.output as AgentAddJobResult | undefined;
    const outcome =
      part.state !== "output-available"
        ? part.state
        : output?.validationError
          ? "validation"
          : output?.created
            ? "created"
            : "duplicate";
    return { tool: part.type.replace(/^tool-/, ""), state: part.state, outcome };
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
  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(windowMessages(messages));
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
  if (pastedText && lastIsUser) {
    const { block } = truncateForModel(pastedText);
    modelMessages.push({ role: "user", content: buildPasteContextMessage(block) });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), APP_CONSTANTS.AGENT_CHAT_TIMEOUT_MS);

  const result = streamText({
    model,
    system: AGENT_CHAT_SYSTEM_PROMPT,
    messages: modelMessages,
    tools: buildAgentTools({ userId, pastedText, pageContext }),
    // Stop after the write: the result card renders deterministically from
    // structured fields, so a second generation just to narrate it is 10-30s
    // of local inference for a sentence that could be wrong.
    stopWhen: [stepCountIs(APP_CONSTANTS.AGENT_CHAT_MAX_STEPS), hasToolCall("add_job")],
    // Argument extraction wants determinism.
    temperature: TEMPERATURES.ANALYSIS,
    abortSignal: controller.signal,
    providerOptions: {
      ollama: { options: { num_ctx: APP_CONSTANTS.AGENT_CHAT_NUM_CTX } },
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ messages: finalMessages, responseMessage, isAborted }) => {
      clearTimeout(timer);
      const { tool, state, outcome } = outcomeOf(responseMessage);
      logTurn({
        provider,
        model: modelName,
        tool,
        toolState: state,
        outcome,
        aborted: isAborted,
        pasteChars: pastedText?.length ?? 0,
        messageCount: finalMessages.length,
      });
      // Stubbing happens here so it lives in exactly one place.
      await saveChatConversation(stubConsumedPastes(finalMessages));
    },
    // NOTE: this signature takes the error directly, unlike streamText's
    // onError which takes { error }.
    onError: (error) => {
      clearTimeout(timer);
      return mapAgentError(error, errorContext);
    },
  });
};
