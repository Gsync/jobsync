import ts from "typescript";
import { anyDescendant, isCallTo, isExported, localFunctions, parse, type FunctionLike } from "./ast";

export interface ActionFinding {
  file: string;
  target: string;
  check: string;
}

function hasDirective(statements: ts.NodeArray<ts.Statement> | undefined): boolean {
  for (const stmt of statements ?? []) {
    if (!ts.isExpressionStatement(stmt) || !ts.isStringLiteral(stmt.expression)) return false;
    if (stmt.expression.text === "use server") return true;
  }
  return false;
}

const bodyStatements = (fn: FunctionLike) =>
  fn.body && ts.isBlock(fn.body) ? fn.body.statements : undefined;

const callsRequireUser = (fn: FunctionLike) =>
  !!fn.body && anyDescendant(fn.body, (n) => isCallTo(n, "requireUser"));

// Exported values with their same-file function, or null when the export
// is not one (a wrapper call, an imported binding).
function exportedFunctions(source: ts.SourceFile, fns: Map<string, FunctionLike>) {
  const exported: [string, FunctionLike | null][] = [];
  for (const stmt of source.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name && isExported(stmt)) {
      exported.push([stmt.name.text, stmt]);
    } else if (ts.isVariableStatement(stmt) && isExported(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) exported.push([decl.name.text, fns.get(decl.name.text) ?? null]);
      }
    } else if (ts.isExportDeclaration(stmt) && !stmt.moduleSpecifier && !stmt.isTypeOnly && stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
      for (const spec of stmt.exportClause.elements.filter((e) => !e.isTypeOnly)) {
        exported.push([spec.name.text, fns.get((spec.propertyName ?? spec.name).text) ?? null]);
      }
    }
  }
  return exported;
}

// Passes a direct requireUser() call or one same-file call into a function
// that makes one; deeper or cross-module delegation is left for review.
function isGuarded(fn: FunctionLike, fns: Map<string, FunctionLike>): boolean {
  if (callsRequireUser(fn)) return true;
  return (
    !!fn.body &&
    anyDescendant(fn.body, (n) => {
      if (!ts.isCallExpression(n) || !ts.isIdentifier(n.expression)) return false;
      const callee = fns.get(n.expression.text);
      return !!callee && callee !== fn && callsRequireUser(callee);
    })
  );
}

// Client-callable functions: exports of a "use server" module, or exports
// carrying their own directive.
export function serverActions(source: ts.SourceFile): [string, FunctionLike | null][] {
  const moduleDirective = hasDirective(source.statements);
  return exportedFunctions(source, localFunctions(source)).filter(
    ([, fn]) => moduleDirective || (!!fn && hasDirective(bodyStatements(fn))),
  );
}

export function scanActionAuth(file: string, sourceText: string): ActionFinding[] {
  const source = parse(file, sourceText);
  const fns = localFunctions(source);
  return serverActions(source).flatMap(([target, fn]) => {
    if (!fn) return [{ file, target, check: "unresolved-export" }];
    return isGuarded(fn, fns) ? [] : [{ file, target, check: "require-user" }];
  });
}
