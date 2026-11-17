import { IdMap, buildCreateData } from "@/lib/backup/idmap";
import { INSERT_ORDER, MODEL_SPECS } from "@/lib/backup/ordering";

// A payload whose ownership columns are a foreign user's id. Every row must
// come out scoped to the session user and none to the id in the file.
describe("ownership rewrite", () => {
  const FOREIGN = "user-from-another-instance";
  const SESSION = "session-user";

  it("never carries a foreign owner id into any model", () => {
    const idMap = new IdMap();
    idMap.mint("row-1");

    for (const model of INSERT_ORDER) {
      const spec = MODEL_SPECS[model];
      const row: Record<string, unknown> = {
        id: "row-1",
        userId: FOREIGN,
        createdBy: FOREIGN,
      };
      // Satisfy the model's foreign keys with self-references into the map.
      for (const field of Object.keys(spec.fks)) row[field] = "row-1";

      const data = buildCreateData(model, row, idMap, SESSION);

      expect(JSON.stringify(data), `${model} leaked the foreign id`).not.toContain(
        FOREIGN,
      );
      if (spec.owner) {
        expect(data[spec.owner]).toBe(SESSION);
      } else {
        expect(data.userId).toBeUndefined();
        expect(data.createdBy).toBeUndefined();
      }
    }
  });
});
