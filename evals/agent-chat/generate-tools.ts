import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getTools } from './tools';

// promptfoo's tools: loader imports TS but returns an empty namespace, so the
// array is materialized to JSON on every eval run. Generated, never edited.
writeFileSync(join(__dirname, 'tools.json'), JSON.stringify(getTools(), null, 2) + '\n');
