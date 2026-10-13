export function getMcpScopeError(scopes: string[], required: string) {
  if (scopes.includes(required)) return null;

  return {
    content: [
      { type: "text" as const, text: `Insufficient scope. Required: ${required}` },
    ],
  };
}
