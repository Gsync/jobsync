import { ESLint } from "eslint";
import { beforeAll, expect, it } from "vitest";

let eslint: ESLint;
beforeAll(() => {
  eslint = new ESLint({ cwd: process.cwd() });
});

async function ruleIds(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  const ids: string[] = [];
  for (const message of result.messages) {
    expect(message.fatal, message.message).toBeFalsy();
    if (!message.ruleId?.startsWith("no-restricted-")) continue;
    expect(message.message).toContain("CLAUDE.md");
    ids.push(message.ruleId);
  }
  return ids;
}

const component = "src/components/Example.tsx";
const route = "src/app/api/v1/jobs/route.ts";
const toast = 'import { toast } from "sonner";';
const storage = 'localStorage.getItem("a"); window.localStorage.getItem("a"); globalThis.localStorage.clear();';
const strict = "z.object({}).strict(); z.strictObject({}); z.object({}).catchall(z.never());";
const imports = "no-restricted-imports";
const syntax = "no-restricted-syntax";
const property = "no-restricted-properties";

it.each([
  [component, toast, [imports]],
  ["src/lib/toast.ts", toast, []],
  ["src/components/ui/sonner.tsx", toast, []],
  [component, storage, ["no-restricted-globals", property, property]],
  ["src/utils/localstorage.utils.ts", storage, []],
  ["src/models/apiV1.schema.ts", strict, [syntax, syntax, syntax]],
  [route, strict, [syntax, syntax, syntax]],
  ["src/models/job.model.ts", strict, []],
  [route, 'import { JOB_TYPES } from "@/models/job.model";', [imports]],
  [route, 'import { ApiV1AddJobSchema } from "@/models/apiV1.schema";', []],
  [route, toast, [imports]],
] satisfies [string, string, string[]][])("checks %s for %s", async (path, code, ids) => {
  expect(await ruleIds(code, path)).toEqual(ids);
});
