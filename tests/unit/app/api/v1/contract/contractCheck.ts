export type FieldType = "string" | "number" | "boolean" | "array" | "object" | "null";

function valueType(value: unknown): string {
  if (value === undefined) return "missing";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function contractViolations(actual: unknown, expected: Record<string, FieldType>): string[] {
  const violations = new Set<string>();
  for (const [path, type] of Object.entries(expected)) {
    const parts = path.match(/[^.[\]]+|\[\]/g)!;

    function check(value: unknown, at: string, depth: number) {
      if (depth === parts.length) {
        const found = valueType(value);
        if (found !== type) violations.add(`${at}: expected ${type}, got ${found}`);
        return;
      }
      const key = parts[depth];
      if (key === "[]") {
        if (!Array.isArray(value)) {
          violations.add(`${at}: expected array, got ${valueType(value)}`);
          return;
        }
        value.forEach((item, i) => check(item, `${at}[${i}]`, depth + 1));
        return;
      }
      const child = value && typeof value === "object" && Object.hasOwn(value, key)
        ? (value as Record<string, unknown>)[key] : undefined;
      check(child, at ? `${at}.${key}` : key, depth + 1);
    }

    check(actual, "", 0);
  }
  return [...violations];
}
