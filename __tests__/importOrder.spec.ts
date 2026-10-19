import { Prisma } from "@prisma/client";
import {
  buildImportPlan,
  delegateName,
  type DmmfModel,
} from "../scripts/import/order";

const models = Prisma.dmmf.datamodel.models as unknown as DmmfModel[];

const model = (name: string, fields: DmmfModel["fields"] = []): DmmfModel => ({
  name,
  fields: [{ name: "id", kind: "scalar", type: "String", isList: false, isId: true }, ...fields],
});
const fk = (name: string, type: string, from: string) => ({
  name,
  kind: "object",
  type,
  isList: false,
  relationName: `${name}Rel`,
  relationFromFields: [from],
});

describe("buildImportPlan on the real schema", () => {
  const plan = buildImportPlan(models);

  it("covers every model exactly once", () => {
    expect([...plan.order].sort()).toEqual(models.map((m) => m.name).sort());
  });

  it("places every foreign-key target before its holder", () => {
    for (const m of models) {
      for (const field of m.fields) {
        const from = field.relationFromFields ?? [];
        if (field.kind !== "object" || from.length === 0) continue;
        if (m.name === "User" && from.includes("defaultResumeId")) continue;
        expect(plan.order.indexOf(field.type)).toBeLessThan(plan.order.indexOf(m.name));
      }
    }
  });

  it("defers only User.defaultResumeId", () => {
    expect(plan.deferred).toEqual([{ model: "User", field: "defaultResumeId" }]);
    expect(plan.order.indexOf("User")).toBeLessThan(plan.order.indexOf("Resume"));
  });

  it("finds both implicit join tables with Prisma's A/B order", () => {
    expect(plan.joinTables).toEqual(
      expect.arrayContaining([
        { table: "_JobToTag", a: "Job", b: "Tag" },
        { table: "_QuestionToTag", a: "Question", b: "Tag" },
      ]),
    );
    expect(plan.joinTables).toHaveLength(2);
  });

  it("does not treat Tag.skills as a join table", () => {
    expect(plan.joinTables.map((j) => j.table)).not.toContain("_SkillToTag");
  });

  it("can cursor every model on a string id", () => {
    for (const m of models) {
      const id = m.fields.find((f) => f.isId);
      expect(id, m.name).toMatchObject({ name: "id", type: "String" });
    }
  });

  it("maps model names to client delegates", () => {
    expect(delegateName("JobStageType")).toBe("jobStageType");
    expect(delegateName("AiCall")).toBe("aiCall");
  });
});

describe("buildImportPlan guards", () => {
  it("throws on a second cycle instead of guessing", () => {
    const cyclic = [model("A", [fk("b", "B", "bId")]), model("B", [fk("a", "A", "aId")])];
    expect(() => buildImportPlan(cyclic)).toThrow(/cycle among: A, B/);
  });

  it("throws on a self-referencing foreign key", () => {
    expect(() => buildImportPlan([model("Node", [fk("parent", "Node", "parentId")])])).toThrow(
      /Self-referencing foreign key on Node\.parent/,
    );
  });

  it("picks up a third implicit many-to-many", () => {
    const list = (name: string, type: string) => ({
      name,
      kind: "object",
      type,
      isList: true,
      relationName: "ContactToTag",
      relationFromFields: [],
    });
    const plan = buildImportPlan([
      model("Tag", [list("contacts", "Contact")]),
      model("Contact", [list("tags", "Tag")]),
    ]);
    expect(plan.joinTables).toEqual([{ table: "_ContactToTag", a: "Contact", b: "Tag" }]);
  });
});
