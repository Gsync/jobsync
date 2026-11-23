import fc from "fast-check";
import { ApiV1AddJobSchema } from "@/models/apiV1.schema";

// The route turns every failed parse into a 400, so a throw here is a 500
const parses = (v: unknown) => {
  const res = ApiV1AddJobSchema.safeParse(v);
  expect(typeof res.success).toBe("boolean");
};

describe("ApiV1AddJobSchema properties", () => {
  it("never throws for any JSON value", () => {
    fc.assert(fc.property(fc.jsonValue(), parses));
  });

  it("never throws for a body with the schema's keys and any JSON values", () => {
    const keys = Object.keys(ApiV1AddJobSchema.shape);
    const body = fc.record(
      Object.fromEntries(keys.map((k) => [k, fc.jsonValue()])),
      { requiredKeys: [] },
    );
    fc.assert(fc.property(body, parses));
  });
});
