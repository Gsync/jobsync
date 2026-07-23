import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getTools } from './tools';

// promptfoo's `tools:` loader imports TS files but comes back with an empty
// module namespace, so the tool array is materialized to JSON first. Run by
// the eval:mcp-tools script on every invocation — tools.json is generated,
// never hand-edited, so it cannot drift from route.ts.
writeFileSync(join(__dirname, 'tools.json'), JSON.stringify(getTools(), null, 2) + '\n');
