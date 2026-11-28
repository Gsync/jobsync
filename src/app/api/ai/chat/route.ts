import "server-only";

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { createUIMessageStreamResponse, type UIMessage } from "ai";
import { getModel } from "@/lib/ai/providers";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import { AgentChatRequestSchema } from "@/models/agent.schema";
import { log } from "@/lib/telemetry";
import { mapAgentError } from "@/lib/agent/errors";
import { resolvePastedText } from "@/lib/agent/memory/paste";
import { buildModelMessages } from "@/lib/agent/memory/modelMessages";
import { runChatTurn } from "@/lib/agent/turn/chatTurn";
import { resolveAiConfig } from "@/lib/ai/aiConfig";
import { getChatConversation, saveChatConversation } from "@/actions/agentChat.actions";
import { mergeCommittedResults } from "@/lib/agent/turn/mergeCommittedResults";
import { reasonlessCancelFor } from "@/lib/agent/turn/runToolDirect";
import { endCancelledTurn } from "@/lib/agent/turn/cancelledTurn";

// A result saved after Stop must survive the browser's stale copy.
async function withCommittedResults(incoming: UIMessage[], userId: string): Promise<UIMessage[]> {
  const stored = await getChatConversation();
  if (stored.success) return mergeCommittedResults(incoming, stored.data ?? []);
  log.warn("Failed to load the chat conversation before saving", { userId, message: stored.message });
  return incoming;
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

  const messages = await withCommittedResults(parsed.data.messages as UIMessage[], userId);
  const { pageContext } = parsed.data;

  // A blank Cancel is a stop; saving it before model setup keeps a reload cancelled.
  const cancelledCallId = reasonlessCancelFor(messages.at(-1));
  if (cancelledCallId) return endCancelledTurn(messages, cancelledCallId);

  // Write-on-receipt. The user's message and the posting they pasted are the
  // expensive half to reproduce, so they are durable before the model is
  // called — a reload, an error or a stop() mid-stream cannot lose them.
  await saveChatConversation(messages);

  let resolved;
  try {
    resolved = await resolveAiConfig(userId, "chat", { requireConfigured: true });
  } catch (error) {
    log.error("Failed to read AI settings for chat", { userId, error: String(error) });
    return NextResponse.json(
      { error: "Couldn't load your AI settings. Try again in a moment." },
      { status: 503 },
    );
  }
  if (!resolved.ok) {
    return NextResponse.json(
      { error: "No AI model is configured. Pick one in Settings to use the assistant." },
      { status: 503 },
    );
  }
  const { provider, modelName } = resolved.config;
  const errorContext = { provider, model: modelName };

  let model;
  try {
    model = await getModel(provider, modelName, userId);
  } catch (error) {
    return NextResponse.json({ error: mapAgentError(error, errorContext) }, { status: 503 });
  }

  const pastedText = resolvePastedText(messages);

  const prepared = await buildModelMessages({ messages, pageContext, pastedText });
  if (!prepared.ok) {
    return NextResponse.json({ error: "Invalid chat request." }, { status: 400 });
  }
  const { modelMessages, historyDropped } = prepared;

  return createUIMessageStreamResponse({
    stream: runChatTurn({
      userId, messages, modelMessages, historyDropped, pageContext, pastedText,
      ai: { ...resolved.config, model }, requestSignal: req.signal,
    }),
  });
};
