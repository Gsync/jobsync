import { generateMockActivitiesAction } from "@/actions/mock.actions";
import db from "@/lib/db";
import { mockActivityTypes } from "@/lib/data/mockActivities";

vi.mock("@/actions/shared", () => ({
  requireUser: vi.fn().mockResolvedValue({ id: "user-1" }),
}));

type TypeRow = { id: string; value: string; createdBy: string };
type TypeWhere = { value: { in: string[] }; createdBy?: string };

const rows: TypeRow[] = [];

vi.mock("@/lib/db", () => ({
  default: {
    activityType: {
      findMany: vi.fn(async ({ where }: { where: TypeWhere }) =>
        rows.filter(
          (r) =>
            where.value.in.includes(r.value) &&
            (where.createdBy === undefined || r.createdBy === where.createdBy),
        ),
      ),
      createMany: vi.fn(async ({ data }: { data: Omit<TypeRow, "id">[] }) => {
        rows.push(...data.map((d) => ({ ...d, id: `own-${d.value}` })));
      }),
    },
    activity: { create: vi.fn(async ({ data }) => data) },
  },
}));

const mockDb = db as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;

describe("generateMockActivitiesAction", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    rows.length = 0;
    rows.push({ id: "other-type", value: mockActivityTypes[0].value, createdBy: "user-2" });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("creates and links the caller's own types, not another user's", async () => {
    const result = await generateMockActivitiesAction();

    expect(result.success).toBe(true);
    const created = mockDb.activityType.createMany.mock.calls[0][0].data;
    expect(created.map((t: TypeRow) => t.value)).toEqual(mockActivityTypes.map((t) => t.value));
    expect(created.every((t: TypeRow) => t.createdBy === "user-1")).toBe(true);
    const typeIds = mockDb.activity.create.mock.calls.map(([arg]) => arg.data.activityTypeId);
    expect(typeIds.length).toBeGreaterThan(0);
    expect(typeIds).not.toContain("other-type");
  });
});
