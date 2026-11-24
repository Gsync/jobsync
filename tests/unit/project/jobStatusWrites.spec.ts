import { readFileSync } from "node:fs";
import { applyExceptions } from "../security/exceptions";
import { checkSourceInvariant } from "./helpers/sourceFiles";
import { scanStatusWrites } from "./helpers/scanStatusWrites";
import { STATUS_WRITE_EXCEPTIONS } from "./invariantExceptions";

const file = "src/actions/x.ts";
const timeline = "src/lib/jobs/timeline/index.ts";
const write = "prisma.job.update({ where, data: { statusId } })";

it.each([
  [write, ["status-write"]],
  ["tx.job.update({ where, data: { ...fields } })", ["unresolved-data"]],
  ["prisma.job.update({ where, data })", ["unresolved-data"]],
  ["prisma.job.update({ where, data: fields() })", ["unresolved-data"]],
  ["prisma.job.update()", ["unresolved-data"]],
  ["db.job.updateMany({ data: { [field]: value } })", ["unresolved-data"]],
  ["prisma.job.update({ where, data: { matchScore } })", []],
  ["prisma.job.upsert({ where, create: { title }, update: { applied: true } })", ["status-write"]],
  ["prisma.job.createMany({ data: [{ title }, { appliedDate }] })", ["status-write"]],
  ["tx[model].create({ data })", ["unresolved-call"]],
] satisfies [string, string[]][])("classifies %s", (source, checks) => {
  expect(scanStatusWrites(file, source).map((f) => f.check)).toEqual(checks);
});

it("allows the timeline implementation only in its own directory", () => {
  expect(scanStatusWrites(timeline, write)).toEqual([]);
  expect(scanStatusWrites("src/actions/copy.ts", readFileSync(timeline, "utf8")).length).toBeGreaterThan(0);
});

it("excepts only the reviewed call in the function", () => {
  const findings = scanStatusWrites(file, `function save() { ${write}; ${write} }`);
  const first = { file, target: "save:job.update#1", check: "status-write" };
  const second = { ...first, target: "save:job.update#2" };
  expect(findings).toEqual([first, second]);
  expect(applyExceptions(findings, [first])).toEqual({ unexcepted: [second], stale: [] });
});

it("keeps job status writes in the timeline", () => {
  checkSourceInvariant(scanStatusWrites, STATUS_WRITE_EXCEPTIONS,
    "Job status is written only through src/lib/jobs/timeline/. Read src/actions/jobStage/CLAUDE.md");
});
