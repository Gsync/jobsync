// Table order for the one-time SQLite -> Postgres copy, derived from the
// Prisma model list so a new model cannot be silently left out.

export interface DmmfField {
  name: string;
  kind: string;
  type: string;
  isList: boolean;
  isId?: boolean;
  relationName?: string | null;
  relationFromFields?: readonly string[] | null;
}

export interface DmmfModel {
  name: string;
  fields: readonly DmmfField[];
}

export interface DeferredEdge {
  model: string;
  field: string;
}

export interface JoinTable {
  table: string;
  a: string;
  b: string;
}

export interface ImportPlan {
  order: string[];
  joinTables: JoinTable[];
  deferred: DeferredEdge[];
}

// User -> Resume -> Profile -> User is the schema's one cycle. This edge is
// nullable, so it is copied as null and set once Resume has landed.
export const DEFERRED_EDGES: readonly DeferredEdge[] = [
  { model: "User", field: "defaultResumeId" },
];

export const delegateName = (model: string) =>
  model[0].toLowerCase() + model.slice(1);

const isDeferred = (model: string, from: readonly string[]) =>
  DEFERRED_EDGES.some((e) => e.model === model && from.includes(e.field));

export function buildImportPlan(models: readonly DmmfModel[]): ImportPlan {
  const byName = new Map(models.map((m) => [m.name, m]));
  const needs = new Map<string, Set<string>>();
  const joins = new Map<string, JoinTable>();

  for (const model of models) {
    const targets = new Set<string>();
    for (const field of model.fields) {
      if (field.kind !== "object") continue;
      const from = field.relationFromFields ?? [];

      if (from.length > 0) {
        if (isDeferred(model.name, from)) continue;
        if (field.type === model.name) {
          throw new Error(
            `Self-referencing foreign key on ${model.name}.${field.name} — the import cannot order it.`,
          );
        }
        targets.add(field.type);
        continue;
      }

      // A list with no FK on either side is an implicit many-to-many, kept
      // by Prisma in a hidden _<relation> table that has no client delegate.
      if (!field.isList || !field.relationName) continue;
      const other = byName
        .get(field.type)
        ?.fields.find(
          (f) =>
            f.kind === "object" &&
            f.relationName === field.relationName &&
            f.name !== field.name,
        );
      if (!other?.isList || (other.relationFromFields ?? []).length > 0) continue;
      const [a, b] = [model.name, field.type].sort();
      joins.set(field.relationName, { table: `_${field.relationName}`, a, b });
    }
    needs.set(model.name, targets);
  }

  const order: string[] = [];
  while (needs.size > 0) {
    const ready = [...needs.keys()].filter((name) =>
      [...needs.get(name)!].every((target) => order.includes(target)),
    );
    if (ready.length === 0) {
      throw new Error(
        `Foreign-key cycle among: ${[...needs.keys()].join(", ")}. Only User.defaultResumeId is deferred; a second cycle is a schema decision, not something the import guesses.`,
      );
    }
    for (const name of ready) {
      order.push(name);
      needs.delete(name);
    }
  }

  return { order, joinTables: [...joins.values()], deferred: [...DEFERRED_EDGES] };
}
