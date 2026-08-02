import { z } from 'zod';
import { AGENT_TOOL_DESCRIPTIONS } from '../../src/lib/agent/prompt';
import { AgentAddJobSchema } from '../../src/models/agent.schema';

// The same schema the chat route registers, so the model sees the exact
// parameter schema and .describe() text the real surface advertises.
export function getTools() {
  return [
    {
      type: 'function',
      function: {
        name: 'add_job',
        description: AGENT_TOOL_DESCRIPTIONS.add_job,
        parameters: z.toJSONSchema(AgentAddJobSchema, { io: 'input' }),
      },
    },
  ];
}

export default getTools;
