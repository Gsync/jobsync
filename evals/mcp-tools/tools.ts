import { z } from 'zod';
import { MCP_TOOL_DESCRIPTIONS } from '../../src/lib/mcp/toolDescriptions';
import {
  McpAddJobInputShape,
  McpFindJobInputShape,
  McpUpdateJobInputShape,
  McpAddQuestionInputShape,
  McpSaveMatchResultInputShape,
  McpAddJobsBatchInputShape,
  McpSaveMatchResultsBatchInputShape,
  McpReviewResumeInputShape,
  McpSaveResumeReviewInputShape,
} from '../../src/models/mcp.schema';

// Same raw shapes route.ts hands the MCP SDK, so the model sees the parameter
// schema and .describe() text the real server advertises. io:'input' keeps the
// pre-transform side (status stays an enum despite its preprocess wrapper).
const SHAPES: Record<string, z.ZodRawShape> = {
  add_job: McpAddJobInputShape,
  find_job: McpFindJobInputShape,
  update_job: McpUpdateJobInputShape,
  add_question: McpAddQuestionInputShape,
  save_match_result: McpSaveMatchResultInputShape,
  add_jobs_batch: McpAddJobsBatchInputShape,
  save_match_results_batch: McpSaveMatchResultsBatchInputShape,
  review_resume: McpReviewResumeInputShape,
  save_resume_review: McpSaveResumeReviewInputShape,
};

export function getTools() {
  return Object.entries(SHAPES).map(([name, shape]) => ({
    type: 'function',
    function: {
      name,
      description: MCP_TOOL_DESCRIPTIONS[name as keyof typeof MCP_TOOL_DESCRIPTIONS],
      parameters: z.toJSONSchema(z.object(shape), { io: 'input' }),
    },
  }));
}

export default getTools;
