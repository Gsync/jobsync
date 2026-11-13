import ts from "typescript";

export type FunctionLike = ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression;

export const parse = (file: string, text: string) =>
  ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

export const isExported = (node: ts.Node) =>
  ts.canHaveModifiers(node) &&
  (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

export function anyDescendant(node: ts.Node, test: (n: ts.Node) => boolean): boolean {
  let found = false;
  const visit = (n: ts.Node) => {
    if (found) return;
    if (test(n)) found = true;
    else ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}

export const isCallTo = (n: ts.Node, name: string) =>
  ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === name;

// Top-level functions by name: declarations and const arrow/function values.
export function localFunctions(source: ts.SourceFile): Map<string, FunctionLike> {
  const fns = new Map<string, FunctionLike>();
  for (const stmt of source.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name) fns.set(stmt.name.text, stmt);
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      const init = decl.initializer;
      if (ts.isIdentifier(decl.name) && init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
        fns.set(decl.name.text, init);
      }
    }
  }
  return fns;
}
