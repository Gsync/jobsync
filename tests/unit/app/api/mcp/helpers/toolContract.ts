export type ToolContract = {
  args: Record<string, string>;
  required: string[];
  enums: Record<string, string[]>;
};

type Schema = {
  type?: string | string[];
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  enum?: string[];
  const?: string;
};

export function summarizeTool(inputSchema: unknown): ToolContract {
  const contract: ToolContract = { args: {}, required: [], enums: {} };

  function visit(schema: Schema, path: string) {
    if (path && schema.type) {
      contract.args[path] = Array.isArray(schema.type) ? [...schema.type].sort().join("|") : schema.type;
    }
    if (schema.enum) contract.enums[path] = schema.enum;
    if (schema.const !== undefined) contract.enums[path] = [schema.const];
    const prefix = path ? path + "." : "";
    for (const key of schema.required ?? []) contract.required.push(prefix + key);
    for (const [key, child] of Object.entries(schema.properties ?? {})) visit(child, prefix + key);
    if (schema.items) visit(schema.items, path + "[]");
  }

  visit(inputSchema as Schema, "");
  return contract;
}

function compareTool(name: string, actual: ToolContract, baseline: ToolContract): string[] {
  const violations: string[] = [];
  for (const [path, type] of Object.entries(baseline.args)) {
    const label = name + "." + path;
    const found = actual.args[path];
    if (found === undefined) {
      violations.push(label + ": missing argument");
      continue;
    }
    if (type !== found) violations.push(`${label}: expected ${type}, got ${found}`);
    const allowed = actual.enums[path];
    if (!allowed) continue;
    if (!baseline.enums[path]) {
      violations.push(label + ": newly constrained to an enum");
      continue;
    }
    for (const value of baseline.enums[path]) {
      if (!allowed.includes(value)) violations.push(`${label}: missing enum value ${value}`);
    }
  }
  for (const path of actual.required) {
    const parent = path.split(".").slice(0, -1).join(".");
    if (parent && !Object.hasOwn(baseline.args, parent)) continue;
    if (!baseline.required.includes(path)) violations.push(`${name}.${path}: newly required`);
  }
  return violations;
}

export function baselineViolations(
  actual: Record<string, ToolContract>,
  baseline: Record<string, ToolContract>,
): string[] {
  return Object.entries(baseline).flatMap(([name, tool]) =>
    actual[name] ? compareTool(name, actual[name], tool) : [name + ": missing tool"],
  );
}
