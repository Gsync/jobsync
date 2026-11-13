import ts from "typescript";
import { anyDescendant, isCallTo, parse, type FunctionLike } from "./ast";
import { serverActions, type ActionFinding } from "./scanActions";
import type { SchemaModel } from "./prismaSchema";

const OPERATIONS = new Set([
  "findFirst", "findFirstOrThrow", "findUnique", "findUniqueOrThrow", "findMany",
  "update", "updateMany", "delete", "deleteMany", "count", "upsert", "aggregate", "groupBy",
]);
const CLIENTS = new Set(["prisma", "db", "tx"]);
const RELATION_WRAPPERS = ["is", "some"];
const NEGATING = new Set(["NOT", "not", "isNot", "none", "every"]);
const GENERIC_OPS = new Set(["update", "delete", "count"]);

type Verdict = "ok" | "owner-value" | "owner-filter" | "unresolved-where";
type Props = Map<string, ts.Expression>;

interface Ctx {
  call: ts.Node;
  schema: Map<string, SchemaModel>;
  actions: Set<FunctionLike>;
}

const unwrap = (e: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e)
    ? unwrap(e.expression)
    : e;

const isFunctionLike = (n: ts.Node): n is FunctionLike =>
  ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n);

// A parameter, for-of/in or catch binding that shadows outer consts.
function bindsName(n: ts.Node, name: string): boolean {
  const named = (b: ts.BindingName | undefined) => !!b && ts.isIdentifier(b) && b.text === name;
  if (isFunctionLike(n)) return n.parameters.some((p) => named(p.name));
  if ((ts.isForOfStatement(n) || ts.isForInStatement(n)) && ts.isVariableDeclarationList(n.initializer)) {
    return n.initializer.declarations.some((d) => named(d.name));
  }
  return ts.isCatchClause(n) && named(n.variableDeclaration?.name);
}

// The nearest const declaration of `name` visible from `from`.
function findConst(name: string, from: ts.Node): ts.VariableDeclaration | undefined {
  for (let scope: ts.Node | undefined = from.parent; scope; scope = scope.parent) {
    if (bindsName(scope, name)) return undefined;
    if (!ts.isBlock(scope) && !ts.isSourceFile(scope)) continue;
    for (const stmt of scope.statements) {
      if (!ts.isVariableStatement(stmt) || !(stmt.declarationList.flags & ts.NodeFlags.Const)) continue;
      const decl = stmt.declarationList.declarations.find(
        (d) => ts.isIdentifier(d.name) && d.name.text === name,
      );
      if (decl) return decl;
    }
  }
  return undefined;
}

const isMutated = (name: string, scope: ts.Node) =>
  anyDescendant(scope, (n) => {
    const target = ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ? n.left
      : ts.isDeleteExpression(n) ? n.expression : undefined;
    const base = target && (ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target))
      ? target.expression
      : undefined;
    const assigned = ts.isCallExpression(n) && n.expression.getText() === "Object.assign" ? n.arguments[0] : base;
    return !!assigned && ts.isIdentifier(assigned) && assigned.text === name;
  });

// Resolves an expression to a constant object literal, or undefined.
function resolveObject(expr: ts.Expression, from: ts.Node): ts.ObjectLiteralExpression | undefined {
  const e = unwrap(expr);
  if (ts.isObjectLiteralExpression(e)) return e;
  if (!ts.isIdentifier(e)) return undefined;
  const decl = findConst(e.text, from);
  if (!decl?.initializer || isMutated(e.text, decl.parent.parent.parent)) return undefined;
  return resolveObject(decl.initializer, decl);
}

// Effective properties, last key wins; undefined on anything unresolvable.
function properties(obj: ts.ObjectLiteralExpression): Props | undefined {
  const props: Props = new Map();
  for (const p of obj.properties) {
    if (ts.isSpreadAssignment(p)) {
      const spread = resolveObject(p.expression, obj);
      const inner = spread && properties(spread);
      if (!inner) return undefined;
      inner.forEach((v, k) => props.set(k, v));
    } else if (ts.isShorthandPropertyAssignment(p)) {
      props.set(p.name.text, p.name);
    } else if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) {
      props.set(p.name.text, p.initializer);
    } else {
      return undefined;
    }
  }
  return props;
}

// requireUser() always yields a user; getCurrentUser() may not, so `user?.id`
// on it can be undefined, which Prisma reads as no filter.
const isSessionUser = (decl: ts.VariableDeclaration | undefined, optional: boolean) => {
  const init = decl?.initializer && unwrap(decl.initializer);
  if (!init || !ts.isAwaitExpression(init)) return false;
  return isCallTo(init.expression, "requireUser") || (!optional && isCallTo(init.expression, "getCurrentUser"));
};

// The function whose parameter `name` is, when one encloses `from`.
function paramOwner(name: string, from: ts.Node): FunctionLike | undefined {
  for (let n: ts.Node | undefined = from.parent; n; n = n.parent) {
    if (!ts.isFunctionDeclaration(n) && !ts.isArrowFunction(n) && !ts.isFunctionExpression(n)) continue;
    if (n.parameters.some((p) => ts.isIdentifier(p.name) && p.name.text === name)) return n;
  }
  return undefined;
}

const insideAction = (from: ts.Node, ctx: Ctx) => {
  for (let n: ts.Node | undefined = from.parent; n; n = n.parent) {
    if (isFunctionLike(n) && ctx.actions.has(n)) return true;
  }
  return false;
};

// `user.id` from requireUser()/getCurrentUser(), directly or via a const, or
// a parameter of a helper the client cannot call directly.
function isUserValue(expr: ts.Expression, from: ts.Node, ctx: Ctx): boolean {
  const e = unwrap(expr);
  if (ts.isPropertyAccessExpression(e) && e.name.text === "id" && ts.isIdentifier(e.expression)) {
    return isSessionUser(findConst(e.expression.text, from), !!e.questionDotToken);
  }
  if (!ts.isIdentifier(e)) return false;
  const decl = findConst(e.text, from);
  if (decl) return !!decl.initializer && isUserValue(decl.initializer, decl, ctx);
  const fn = paramOwner(e.text, from);
  return !!fn && !insideAction(from, ctx);
}

const RANK: Verdict[] = ["ok", "owner-value", "unresolved-where", "owner-filter"];
const best = (verdicts: Verdict[]): Verdict =>
  verdicts.reduce((a, b) => (RANK.indexOf(a) <= RANK.indexOf(b) ? a : b), "owner-filter");

function relationVerdict(target: SchemaModel, value: ts.Expression, ctx: Ctx): Verdict {
  const obj = resolveObject(value, ctx.call);
  if (!obj) return "unresolved-where";
  const props = properties(obj);
  const wrapped = RELATION_WRAPPERS.map((w) => props?.get(w)).find(Boolean);
  return wrapped ? relationVerdict(target, wrapped, ctx) : ownerVerdict(target, obj, ctx);
}

function keyVerdict(model: SchemaModel, key: string, value: ts.Expression, ctx: Ctx): Verdict {
  if (NEGATING.has(key)) return "owner-filter";
  if (model.ownerKeys.includes(key)) return isUserValue(value, value, ctx) ? "ok" : "owner-value";
  if (key === "AND") {
    const e = unwrap(value);
    const items = ts.isArrayLiteralExpression(e) ? [...e.elements] : [e];
    return best(items.map((item) => relationVerdict(model, item as ts.Expression, ctx)));
  }
  const type = model.fields.get(key);
  const related = type && ctx.schema.get(type[0].toLowerCase() + type.slice(1));
  if (related) return relationVerdict(related, value, ctx);
  // A compound unique key names its fields joined by `_` (`value_createdBy`).
  const parts = key.split("_");
  if (!type && parts.length > 1 && parts.every((f) => model.fields.has(f))) return relationVerdict(model, value, ctx);
  return "owner-filter";
}

function ownerVerdict(model: SchemaModel, where: ts.ObjectLiteralExpression, ctx: Ctx): Verdict {
  const props = properties(where);
  if (!props) return "unresolved-where";
  return best([...props].map(([key, value]) => keyVerdict(model, key, value, ctx)));
}

function callVerdict(call: ts.CallExpression, model: SchemaModel, ctx: Ctx): Verdict | "no-where" {
  const args = call.arguments[0] && resolveObject(call.arguments[0], call);
  if (!args) return call.arguments[0] ? "unresolved-where" : "no-where";
  const argProps = properties(args);
  if (!argProps) return "unresolved-where";
  const where = argProps.get("where");
  if (!where) return "no-where";
  const obj = resolveObject(where, call);
  return obj ? ownerVerdict(model, obj, ctx) : "unresolved-where";
}

function containingFunction(node: ts.Node): string {
  for (let n: ts.Node | undefined = node.parent; n; n = n.parent) {
    if (ts.isFunctionDeclaration(n) && n.name) return n.name.text;
    if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && ts.isVariableDeclaration(n.parent) && ts.isIdentifier(n.parent.name)) {
      return n.parent.name.text;
    }
  }
  return "<module>";
}

const isClient = (e: ts.Expression) => ts.isIdentifier(e) && CLIENTS.has(e.text);

// `const m = prisma.job` aliases a delegate.
const isDelegateAlias = (name: string, from: ts.Node) => {
  const init = findConst(name, from)?.initializer;
  return !!init && ts.isPropertyAccessExpression(unwrap(init)) &&
    isClient((unwrap(init) as ts.PropertyAccessExpression).expression);
};

type PrismaCall = { call: ts.CallExpression; delegate: string; op: string; known: boolean };

// `<client>.<delegate>.<operation>(...)` calls, plus delegates reached through
// a variable or computed access, which are reported as unresolved.
function prismaCalls(source: ts.SourceFile, schema: Map<string, SchemaModel>): PrismaCall[] {
  const calls: PrismaCall[] = [];
  const viaVariable = new Set<string>();
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && OPERATIONS.has(n.expression.name.text)) {
      const owner = n.expression.expression;
      const op = n.expression.name.text;
      if (ts.isPropertyAccessExpression(owner) && (isClient(owner.expression) || schema.has(owner.name.text))) {
        calls.push({ call: n, delegate: owner.name.text, op, known: isClient(owner.expression) && schema.has(owner.name.text) });
      } else if (ts.isElementAccessExpression(owner) && isClient(unwrap(owner.expression))) {
        calls.push({ call: n, delegate: owner.getText(), op, known: false });
      } else if (ts.isIdentifier(owner)) {
        const receiver = `${containingFunction(n)}|${owner.text}`;
        if (!GENERIC_OPS.has(op) || isDelegateAlias(owner.text, n)) viaVariable.add(receiver);
        calls.push({ call: n, delegate: owner.text, op, known: false });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(source);
  // A receiver counts as a delegate once any call on it is Prisma-specific.
  return calls.filter(({ call, delegate, known }) =>
    known || !ts.isIdentifier((call.expression as ts.PropertyAccessExpression).expression) ||
    viaVariable.has(`${containingFunction(call)}|${delegate}`));
}

export function scanOwnership(
  file: string,
  sourceText: string,
  schema: Map<string, SchemaModel>,
  globalModels: string[],
): ActionFinding[] {
  const source = parse(file, sourceText);
  const actions = new Set(serverActions(source).flatMap(([, fn]) => (fn ? [fn] : [])));
  const ordinals = new Map<string, number>();
  return prismaCalls(source, schema).flatMap(({ call, delegate, op, known }) => {
    const key = `${containingFunction(call)}:${delegate}.${op}`;
    const ordinal = (ordinals.get(key) ?? 0) + 1;
    ordinals.set(key, ordinal);
    const target = `${key}#${ordinal}`;
    if (!known) return [{ file, target, check: "unresolved-call" }];
    if (globalModels.includes(delegate)) return [];
    const verdict = callVerdict(call, schema.get(delegate)!, { call, schema, actions });
    return verdict === "ok" ? [] : [{ file, target, check: verdict }];
  });
}
