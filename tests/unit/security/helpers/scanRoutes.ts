import ts from "typescript";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { anyDescendant, isCallTo, isExported, localFunctions, parse, type FunctionLike } from "./ast";

export type RouteCheck =
  | "auth-call"
  | "status-401"
  | "unresolved-handler"
  | "no-handler"
  | "proxy-coverage"
  | "unsupported-segment";

export interface RouteFinding {
  file: string;
  target: string;
  check: RouteCheck;
}

const HTTP_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);

const isAuthCall = (n: ts.Node) => isCallTo(n, "auth");

const isStatus401 = (n: ts.Node) =>
  ts.isPropertyAssignment(n) &&
  ts.isIdentifier(n.name) &&
  n.name.text === "status" &&
  ts.isNumericLiteral(n.initializer) &&
  n.initializer.text === "401";

// Maps each exported HTTP method to its function, or null when unresolvable.
function exportedHandlers(source: ts.SourceFile): [string, FunctionLike | null][] {
  const fns = localFunctions(source);
  const handlers: [string, FunctionLike | null][] = [];
  const add = (name: string, fn: FunctionLike | null) => {
    if (HTTP_METHODS.has(name)) handlers.push([name, fn]);
  };
  for (const stmt of source.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name && isExported(stmt)) {
      add(stmt.name.text, stmt);
    } else if (ts.isVariableStatement(stmt) && isExported(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) add(decl.name.text, fns.get(decl.name.text) ?? null);
        else ts.forEachChild(decl.name, (el) => {
          if (ts.isBindingElement(el) && ts.isIdentifier(el.name)) add(el.name.text, null);
        });
      }
    } else if (ts.isExportDeclaration(stmt) && !stmt.exportClause) {
      handlers.push(["*", null]);
    } else if (ts.isExportDeclaration(stmt) && stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
      // A re-export from another module has no body here to inspect.
      for (const spec of stmt.exportClause.elements) {
        const local = stmt.moduleSpecifier ? undefined : fns.get((spec.propertyName ?? spec.name).text);
        add(spec.name.text, local ?? null);
      }
    }
  }
  return handlers;
}

function checkHandler(fn: FunctionLike | null): RouteCheck | null {
  if (!fn?.body) return "unresolved-handler";
  if (!anyDescendant(fn.body, isAuthCall)) return "auth-call";
  if (!anyDescendant(fn.body, isStatus401)) return "status-401";
  return null;
}

export function scanRouteHandlers(file: string, sourceText: string): RouteFinding[] {
  const source = parse(file, sourceText);
  const handlers = exportedHandlers(source);
  if (handlers.length === 0) return [{ file, target: "(file)", check: "no-handler" }];
  return handlers.flatMap(([target, fn]) => {
    const check = checkHandler(fn);
    return check ? [{ file, target, check }] : [];
  });
}

export function extractMatcher(sourceText: string): string[] {
  const source = parse("proxy.ts", sourceText);
  for (const stmt of source.statements) {
    if (!ts.isVariableStatement(stmt) || !isExported(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== "config") continue;
      if (!decl.initializer || !ts.isObjectLiteralExpression(decl.initializer)) continue;
      const prop = decl.initializer.properties.find(
        (p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === "matcher",
      );
      const list = prop && ts.isPropertyAssignment(prop) ? prop.initializer : undefined;
      if (list && ts.isArrayLiteralExpression(list) && list.elements.every(ts.isStringLiteral)) {
        return list.elements.map((el) => (el as ts.StringLiteral).text);
      }
    }
  }
  throw new Error("proxy config.matcher is not a literal string array");
}

// Expands a route file into concrete URLs, one per optional-segment choice.
export function routeUrls(file: string): { urls: string[]; unsupported: string[] } {
  const segments = file.replace(/^src\/app\//, "").split("/").slice(0, -1);
  let urls = [""];
  const unsupported: string[] = [];
  for (const seg of segments) {
    if (/^\[\[\.\.\.[^\]]+\]\]$/.test(seg)) urls = urls.flatMap((u) => [u, `${u}/test/path`]);
    else if (/^\[\.\.\.[^\]]+\]$/.test(seg)) urls = urls.map((u) => `${u}/test/path`);
    else if (/^\[[^\].]+\]$/.test(seg)) urls = urls.map((u) => `${u}/test-id`);
    else if (/^\([^.)][^)]*\)$/.test(seg)) continue;
    else if (/^[A-Za-z0-9-]+$/.test(seg)) urls = urls.map((u) => `${u}/${seg}`);
    else unsupported.push(seg);
  }
  return { urls, unsupported };
}

export function scanProxyCoverage(files: string[], matcher: string[]): RouteFinding[] {
  return files.flatMap((file): RouteFinding[] => {
    const { urls, unsupported } = routeUrls(file);
    if (unsupported.length > 0) {
      return unsupported.map((target) => ({ file, target, check: "unsupported-segment" }));
    }
    return urls
      .filter((url) => !unstable_doesMiddlewareMatch({ config: { matcher }, url }))
      .map((target) => ({ file, target, check: "proxy-coverage" }));
  });
}
