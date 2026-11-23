// Choice labels shared by MCP prose and the chat transcript's fallback
export const SAVE_AS_NEW = "save as new";
export const SKIP = "skip";

// Merge choices one saved target permits for an incoming answer. A missing
// canReplace (an older transcript) never offers replace
export function mergeChoices(target: { hasAnswer: boolean; canReplace?: boolean }): string[] {
  const add = target.hasAnswer ? "add below the saved answer" : "add your answer as its first answer";
  return target.canReplace ? [add, "replace the saved answer"] : [add];
}
