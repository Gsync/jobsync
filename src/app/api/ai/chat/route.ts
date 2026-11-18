import "server-only";

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { createUIMessageStreamResponse, type UIMessage } from "ai";
import { getModel, type ProviderType } from "@/lib/ai/providers";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import { AgentChatRequestSchema } from "@/models/agent.schema";
import { AiProvider } from "@/models/ai.model";
import { mapAgentError } from "@/lib/agent/errors";
import { resolvePastedText } from "@/lib/agent/memory/paste";
import { buildModelMessages } from "@/lib/agent/memory/modelMessages";
import { runChatTurn } from "@/lib/agent/turn/chatTurn";
import { getUserSettings } from "@/actions/userSettings.actions";
import { saveChatConversation } from "@/actions/agentChat.actions";

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

  const prepared = await buildModelMessages({ messages, pageContext, pastedText });
  if (!prepared.ok) {
    return NextResponse.json({ error: "Invalid chat request." }, { status: 400 });
  }
  const { modelMessages, historyDropped } = prepared;

  return createUIMessageStreamResponse({
    stream: runChatTurn({
      userId, messages, modelMessages, historyDropped, pageContext, pastedText,
      ai: { provider, modelName, model }, requestSignal: req.signal,
    }),
  });
};
