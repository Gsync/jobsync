export interface SchemaModel {
  name: string;
  // Field name → type name (a model name for relation fields).
  fields: Map<string, string>;
  ownerKeys: string[];
}

const OWNER_COLUMNS = new Set(["userId", "createdBy"]);

export const delegateName = (model: string) => model[0].toLowerCase() + model.slice(1);

// Keyed by Prisma client delegate name (`jobStage`), not model name.
export function parseSchema(text: string): Map<string, SchemaModel> {
  const models = new Map<string, SchemaModel>();
  for (const [, name, body] of text.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    const fields = new Map<string, string>();
    for (const line of body.split("\n")) {
      const match = line.match(/^\s*(\w+)\s+(\w+)/);
      if (match) fields.set(match[1], match[2]);
    }
    const ownerKeys = name === "User" ? ["id"] : [...fields.keys()].filter((f) => OWNER_COLUMNS.has(f));
    models.set(delegateName(name), { name, fields, ownerKeys });
  }
  return models;
}
