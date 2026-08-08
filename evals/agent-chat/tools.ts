import { z } from 'zod';
import { AGENT_TOOL_DESCRIPTIONS } from '../../src/lib/agent/prompt';
import {
  AgentAddJobSchema,
  AgentGetResumeSchema,
  AgentMatchJobSchema,
  AgentReviewResumeSchema,
} from '../../src/models/agent.schema';

// The same schemas the chat route registers, so the model sees the exact
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
    {
      type: 'function',
      function: {
        name: 'get_resume',
        description: AGENT_TOOL_DESCRIPTIONS.get_resume,
        parameters: z.toJSONSchema(AgentGetResumeSchema, { io: 'input' }),
      },
    },
    {
      type: 'function',
      function: {
        name: 'review_resume',
        description: AGENT_TOOL_DESCRIPTIONS.review_resume,
        parameters: z.toJSONSchema(AgentReviewResumeSchema, { io: 'input' }),
      },
    },
    {
      type: 'function',
      function: {
        name: 'match_job',
        description: AGENT_TOOL_DESCRIPTIONS.match_job,
        parameters: z.toJSONSchema(AgentMatchJobSchema, { io: 'input' }),
      },
    },
  ];
}

export default getTools;
