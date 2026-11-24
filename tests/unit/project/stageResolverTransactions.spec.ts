import { readFileSync } from "node:fs";
import { scanResolverTransactions, STAGE_TYPE_RESOLVERS } from "./helpers/scanResolverTransactions";
import { checkSourceInvariant } from "./helpers/sourceFiles";
import { RESOLVER_TX_EXCEPTIONS } from "./invariantExceptions";

const file = "src/actions/x.ts";
const helper = "const pick = async () => resolveJobStageType(value);";
const rule = "Stage-type resolvers write through the base client, so a rollback would not undo them. Read src/actions/jobStage/CLAUDE.md";

it.each([
  ["await prisma.$transaction(async (tx) => { await resolveStageTypeForStatusId(id) })", ["save:resolveStageTypeForStatusId#1"]],
  ["await resolveStageTypeForStatusId(id); await prisma.$transaction(async (tx) => tx.job.update(args))", []],
  ["await prisma.$transaction(async () => pick())", ["save:resolveJobStageType#1"]],
  ["await prisma.$transaction(pick)", ["save:resolveJobStageType#1"]],
  ["const run = async () => resolveJobStageType(value); await prisma.$transaction(run)", ["save:resolveJobStageType#1"]],
  ["const pick = async (tx) => tx.job.update(args); await prisma.$transaction(pick)", []],
  ["await pick(); await prisma.$transaction(async (tx) => tx.job.update(args))", []],
] satisfies [string, string[]][])("checks resolver calls in %s", (body, targets) => {
  const source = `${helper} async function save() { ${body} }`;
  expect(scanResolverTransactions(file, source)).toEqual(
    targets.map((target) => ({ file, target, check: "resolver-in-transaction" })),
  );
});

it("keeps the checked names in sync with the resolver exports", () => {
  const source = readFileSync("src/lib/jobs/resolve.ts", "utf8");
  for (const name of STAGE_TYPE_RESOLVERS) {
    expect(source, rule).toMatch(new RegExp(`export async function ${name}\\b`));
  }
});

it("resolves stage types before opening a transaction", () => {
  checkSourceInvariant(scanResolverTransactions, RESOLVER_TX_EXCEPTIONS, rule);
}, 30_000);
