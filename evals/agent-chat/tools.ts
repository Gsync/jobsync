import { z } from 'zod';
import { AGENT_TOOL_DESCRIPTIONS } from '../../src/lib/agent/prompt';
import {
  AgentAddJobSchema,
  AgentCoverLetterSchema,
  AgentGetResumeSchema,
  AgentMatchJobSchema,
  AgentReviewResumeSchema,
  AgentScrapeJobSchema,
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
        name: 'scrape_job',
        description: AGENT_TOOL_DESCRIPTIONS.scrape_job,
        parameters: z.toJSONSchema(AgentScrapeJobSchema, { io: 'input' }),
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
    {
      type: 'function',
      function: {
        name: 'generate_cover_letter',
        description: AGENT_TOOL_DESCRIPTIONS.generate_cover_letter,
        parameters: z.toJSONSchema(AgentCoverLetterSchema, { io: 'input' }),
      },
    },
  ];
}

export default getTools;
