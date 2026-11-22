import { z } from 'zod';
import { AGENT_TOOL_META, AGENT_TOOL_NAMES, type AgentToolName } from '../../src/lib/agent/registry';
import {
  AgentAddJobSchema,
  AgentAddQuestionSchema,
  AgentCoverLetterSchema,
  AgentGetResumeSchema,
  AgentMatchJobSchema,
  AgentReviewResumeSchema,
} from '../../src/models/agent.schema';

const SCHEMAS: Record<AgentToolName, z.ZodType> = {
  add_job: AgentAddJobSchema,
  get_resume: AgentGetResumeSchema,
  review_resume: AgentReviewResumeSchema,
  match_job: AgentMatchJobSchema,
  generate_cover_letter: AgentCoverLetterSchema,
  add_question: AgentAddQuestionSchema,
};

export function getTools() {
  return AGENT_TOOL_NAMES.map((name) => ({
    type: 'function',
    function: {
      name,
      description: AGENT_TOOL_META[name].description,
      parameters: z.toJSONSchema(SCHEMAS[name], { io: 'input' }),
    },
  }));
}

export default getTools;
