import ts from "typescript";
import type { FindingKey } from "../../security/exceptions";
import { containingFunction, nextTarget, parse, walk } from "../../security/helpers/ast";

export const STATUS_FIELDS = ["statusId", "applied", "appliedDate"];
const operations = new Set(["create", "createMany", "update", "updateMany", "upsert"]);
const clients = new Set(["prisma", "db", "tx"]);

function dataCheck(data: ts.Expression | undefined) {
  if (!data || !ts.isObjectLiteralExpression(data)) return "unresolved-data";
  const names: string[] = [];
  for (const prop of data.properties) {
    if (!prop.name || !(ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name))) return "unresolved-data";
    names.push(prop.name.text);
  }
  return names.some((name) => STATUS_FIELDS.includes(name)) ? "status-write" : undefined;
}

function writeChecks(op: string, arg: ts.Expression | undefined) {
  if (!arg || !ts.isObjectLiteralExpression(arg)) return ["unresolved-data"];
  if (arg.properties.some((p) => ts.isSpreadAssignment(p) || ts.isComputedPropertyName(p.name))) {
    return ["unresolved-data"];
  }
  const keys = op === "upsert" ? ["create", "update"] : ["data"];
  const checks = new Set<string>();
  for (const key of keys) {
    const prop = arg.properties.find((p) => p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === key);
    const data = prop && ts.isPropertyAssignment(prop) ? prop.initializer : undefined;
    const rows = op === "createMany" && data && ts.isArrayLiteralExpression(data) ? data.elements : [data];
    for (const row of rows) {
      const check = dataCheck(row);
      if (check) checks.add(check);
    }
  }
  return [...checks];
}

export function scanStatusWrites(file: string, source: string): FindingKey[] {
  if (file.startsWith("src/lib/jobs/timeline/")) return [];
  const findings: FindingKey[] = [];
  const ordinals = new Map<string, number>();
  walk(parse(file, source), (node) => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    const op = node.expression.name.text;
    if (!operations.has(op)) return;
    const delegate = node.expression.expression;
    if (!(ts.isPropertyAccessExpression(delegate) || ts.isElementAccessExpression(delegate))) return;
    if (!ts.isIdentifier(delegate.expression) || !clients.has(delegate.expression.text)) return;
    const computed = ts.isElementAccessExpression(delegate);
    if (!computed && delegate.name.text !== "job") return;
    const name = computed ? delegate.getText() : "job";
    const target = nextTarget(ordinals, `${containingFunction(node)}:${name}.${op}`);
    const checks = computed ? ["unresolved-call"] : writeChecks(op, node.arguments[0]);
    for (const check of checks) findings.push({ file, target, check });
  });
  return findings;
}
