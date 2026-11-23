import ts from "typescript";
import type { FindingKey } from "../../security/exceptions";
import { containingFunction, localFunctions, nextTarget, parse, walk, type FunctionLike } from "../../security/helpers/ast";

export const STAGE_TYPE_RESOLVERS = ["resolveStageTypeForStatusId", "resolveJobStageType"];

function transactionCallback(arg: ts.Expression | undefined): FunctionLike | undefined {
  if (!arg) return;
  if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) return arg;
  if (!ts.isIdentifier(arg)) return;
  for (let scope: ts.Node | undefined = arg.parent; scope; scope = scope.parent) {
    if (ts.isFunctionLike(scope) && scope.parameters.some((p) => p.name.getText() === arg.text)) return;
    if (!ts.isBlock(scope) && !ts.isSourceFile(scope)) continue;
    const fn = localFunctions(scope).get(arg.text);
    if (fn) return fn;
    const shadowed = scope.statements.some((s) => ts.isVariableStatement(s) &&
      s.declarationList.declarations.some((d) => d.name.getText() === arg.text));
    if (shadowed) return;
  }
}

function resolverCalls(body: ts.Node, helpers: Map<string, FunctionLike>): Set<ts.CallExpression> {
  const calls = new Set<ts.CallExpression>();
  const visit = (node: ts.Node, followHelper: boolean) => {
    if (!ts.isCallExpression(node)) return;
    const callee = node.expression;
    const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : undefined;
    if (name && STAGE_TYPE_RESOLVERS.includes(name)) {
      calls.add(node);
    } else if (followHelper && ts.isIdentifier(callee)) {
      const helper = helpers.get(callee.text);
      if (helper?.body) walk(helper.body, (child) => visit(child, false));
    }
  };
  walk(body, (child) => visit(child, true));
  return calls;
}

export function scanResolverTransactions(file: string, source: string): FindingKey[] {
  const tree = parse(file, source);
  const helpers = localFunctions(tree);
  const findings: FindingKey[] = [];
  const ordinals = new Map<string, number>();
  walk(tree, (node) => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    if (node.expression.name.text !== "$transaction") return;
    const callback = transactionCallback(node.arguments[0]);
    if (!callback?.body) return;
    for (const call of resolverCalls(callback.body, helpers)) {
      const resolver = ts.isPropertyAccessExpression(call.expression) ? call.expression.name.text : call.expression.getText();
      const target = nextTarget(ordinals, `${containingFunction(node)}:${resolver}`);
      findings.push({ file, target, check: "resolver-in-transaction" });
    }
  });
  return findings;
}
