import ts from "typescript";
import type { FindingKey } from "../../security/exceptions";
import { containingFunction, nextTarget, parse, walk } from "../../security/helpers/ast";

const reads = new Set(["findMany", "findFirst", "findFirstOrThrow"]);

function propertyNamed(name: ts.PropertyName | undefined, key: string) {
  return name && (ts.isIdentifier(name) || ts.isStringLiteral(name)) && name.text === key;
}

function stageQuery(node: ts.Node) {
  if (ts.isPropertyAssignment(node) && propertyNamed(node.name, "stages")) {
    return { name: "stages", options: node.initializer };
  }
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
  const { expression: delegate, name } = node.expression;
  if (!reads.has(name.text) || !ts.isPropertyAccessExpression(delegate) || delegate.name.text !== "jobStage") return;
  return { name: `jobStage.${name.text}`, options: node.arguments[0] };
}

export function scanStageOrderBy(file: string, source: string): FindingKey[] {
  const findings: FindingKey[] = [];
  const ordinals = new Map<string, number>();
  walk(parse(file, source), (node) => {
    const query = stageQuery(node);
    if (!query) return;
    const target = nextTarget(ordinals, `${containingFunction(node)}:${query.name}`);
    const options = query.options;
    if (options && ts.isObjectLiteralExpression(options) && options.properties.some((p) => propertyNamed(p.name, "orderBy"))) {
      findings.push({ file, target, check: "stage-order-by" });
    }
  });
  return findings;
}
