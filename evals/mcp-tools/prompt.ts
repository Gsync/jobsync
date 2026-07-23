// Deliberately thin. The point of these evals is that the TOOL DESCRIPTIONS
// carry the routing, so the system prompt must not do that work for them —
// don't add hints like "use add_jobs_batch for multiple jobs" here.
const SYSTEM_PROMPT =
  'You are a helpful assistant connected to the user\'s JobSync account through its MCP tools. ' +
  'Use the available tools to carry out the user\'s request. Do not ask for confirmation.';

type Message = Record<string, unknown>;

// vars.priorTool/priorArgs/priorResult replay a completed tool round-trip so a
// case can assert what the model does NEXT (e.g. follows the match directive
// add_job hands back).
export default function prompt({ vars }: { vars: Record<string, string> }): Message[] {
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: vars.userMessage },
  ];

  if (vars.priorTool) {
    messages.push({
      role: 'assistant',
      content: null,
      // DeepSeek rejects a replayed assistant turn in thinking mode unless
      // reasoning_content comes back with it; harmless on other providers.
      reasoning_content: vars.priorReasoning ?? 'Saving the posting the user supplied.',
      tool_calls: [
        {
          id: 'call_prior',
          type: 'function',
          function: { name: vars.priorTool, arguments: vars.priorArgs ?? '{}' },
        },
      ],
    });
    messages.push({
      role: 'tool',
      tool_call_id: 'call_prior',
      content: vars.priorResult ?? '',
    });
  }

  return messages;
}
