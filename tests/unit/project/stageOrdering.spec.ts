import { scanStageOrderBy } from "./helpers/scanStageOrderBy";
import { checkSourceInvariant } from "./helpers/sourceFiles";
import { STAGE_ORDER_EXCEPTIONS } from "./invariantExceptions";

const file = "src/actions/x.ts";
it.each([
  ['prisma.jobStage.findMany({ orderBy: { occurredAt: "asc" } })', ["list:jobStage.findMany#1"]],
  ["tx.jobStage.findFirst({ orderBy })", ["list:jobStage.findFirst#1"]],
  ["db.jobStage.findFirstOrThrow({ orderBy })", ["list:jobStage.findFirstOrThrow#1"]],
  ['query({ include: { stages: { orderBy: { createdAt: "asc" } } } })', ["list:stages#1"]],
  ["query({ stages: { include: STAGE_DETAIL_INCLUDE } })", []],
  ['prisma.jobStageType.findMany({ orderBy: { sortOrder: "asc" } })', []],
  ['query({ stages: { include: { StageType: true, interviewers: { orderBy: { createdAt: "asc" } } } } })', []],
] satisfies [string, string[]][])("checks ordering for %s", (body, targets) => {
  expect(scanStageOrderBy(file, `function list() { ${body} }`)).toEqual(
    targets.map((target) => ({ file, target, check: "stage-order-by" })),
  );
});

it("leaves timeline ordering to sortStages", () => {
  checkSourceInvariant(scanStageOrderBy, STAGE_ORDER_EXCEPTIONS,
    "Stage order is sortStages (src/lib/jobs/sortStages.ts), never a Prisma orderBy. Read src/actions/jobStage/CLAUDE.md");
});
