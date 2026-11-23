// Choice labels shared by MCP prose and the chat transcript's fallback
export const SAVE_AS_NEW = "save as new";
export const SKIP = "skip";

// Merges one target permits; no canReplace (older transcript) means no replace
export function mergeChoices(target: { hasAnswer: boolean; canReplace?: boolean }): string[] {
  const add = target.hasAnswer ? "add below the saved answer" : "add your answer as its first answer";
  return target.canReplace ? [add, "replace the saved answer"] : [add];
}
