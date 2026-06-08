import { zodToJsonSchema } from 'zod-to-json-schema';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { ResumeReviewSchema } from '../src/models/ai.schemas';

const schema = zodToJsonSchema(ResumeReviewSchema, {
  name: 'ResumeReviewResponse',
  $refStrategy: 'none',
});

const out = join(__dirname, '../evals/resume-review/schemas/resume-review.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(schema, null, 2));
console.log('Written:', out);
