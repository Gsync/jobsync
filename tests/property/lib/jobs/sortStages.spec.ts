import fc from "fast-check";
import { sortStages } from "@/lib/jobs/sortStages";

const DATES = [1, 2, 3, 4, 5].map((d) => new Date(Date.UTC(2026, 0, d)));

// Few dates and sortOrders force ties; unique createdAt makes order total
const stages = fc
  .uniqueArray(fc.integer({ min: 0, max: 10_000 }), { maxLength: 12 })
  .chain((created) =>
    fc.tuple(
      ...created.map((createdAt, id) =>
        fc.record({
          id: fc.constant(id),
          createdAt: fc.constant(new Date(createdAt)),
          occurredAt: fc.option(fc.constantFrom(...DATES), { nil: null }),
          StageType: fc.record({ sortOrder: fc.integer({ min: 0, max: 3 }) }),
        }),
      ),
    ),
  );

const ids = (list: { id: number }[]) => list.map((s) => s.id);

describe("sortStages properties", () => {
  it("returns the same stages", () => {
    fc.assert(
      fc.property(stages, (input) => {
        expect(ids(sortStages(input)).sort()).toEqual(ids(input).sort());
      }),
    );
  });

  it("does not mutate its input", () => {
    fc.assert(
      fc.property(stages, (input) => {
        const before = structuredClone(input);
        sortStages(input);
        expect(input).toEqual(before);
      }),
    );
  });

  it("gives the same order for any input order", () => {
    fc.assert(
      fc.property(
        stages.chain((s) =>
          fc.tuple(
            fc.constant(s),
            fc.shuffledSubarray(s, { minLength: s.length, maxLength: s.length }),
          ),
        ),
        ([input, shuffled]) => {
          expect(ids(sortStages(shuffled))).toEqual(ids(sortStages(input)));
        },
      ),
    );
  });

  it("orders by sortOrder, then dated before undated, then date", () => {
    fc.assert(
      fc.property(stages, (input) => {
        const out = sortStages(input);
        for (let i = 1; i < out.length; i++) {
          const a = out[i - 1];
          const b = out[i];
          expect(a.StageType.sortOrder).toBeLessThanOrEqual(
            b.StageType.sortOrder,
          );
          if (a.StageType.sortOrder !== b.StageType.sortOrder) continue;
          if (b.occurredAt) expect(a.occurredAt).not.toBeNull();
          if (a.occurredAt && b.occurredAt) {
            expect(a.occurredAt.getTime()).toBeLessThanOrEqual(
              b.occurredAt.getTime(),
            );
          }
        }
      }),
    );
  });
});
