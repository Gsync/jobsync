import { APP_CONSTANTS } from "@/lib/constants";

const contextSizes = {
  chat: APP_CONSTANTS.AGENT_CHAT_NUM_CTX,
  chat_nested: APP_CONSTANTS.AI_OLLAMA_NUM_CTX,
  analyze: undefined,
  automation_match: undefined,
};

export type AiSurface = keyof typeof contextSizes;

export function numCtxFor<S extends AiSurface>(surface: S) {
  return contextSizes[surface];
}
