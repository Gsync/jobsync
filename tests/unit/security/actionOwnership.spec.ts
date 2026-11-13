// @vitest-environment node
// Structural guardrail for server action auth and Prisma ownership (root
// CLAUDE.md, Server Actions and Ownership). Flags departures, it does not
// prove authorization: an owner key in a `where` says nothing about control
// flow, and one-level same-file delegation is the deepest call it follows.
// Cross-user behaviour stays covered by the per-action specs.
import fs from "node:fs";
import path from "node:path";
import { scanActionAuth } from "./helpers/scanActions";
import { scanOwnership } from "./helpers/scanOwnership";
import { parseSchema } from "./helpers/prismaSchema";
import { ACTION_EXCEPTIONS, applyExceptions, GLOBAL_MODELS } from "./exceptions";

const MINI_SCHEMA = parseSchema(`
model User {
  id    String @id
  email String
  jobs  Job[]
}
model Job {
  id     String     @id
  userId String
  User   User       @relation(fields: [userId], references: [id])
  stages JobStage[]
}
model JobStage {
  id    String @id
  jobId String
  Job   Job    @relation(fields: [jobId], references: [id])
}
model Tag {
  id        String @id
  value     String
  createdBy String
  user      User   @relation(fields: [createdBy], references: [id])
  @@unique([value, createdBy])
}
model JobStatus {
  id    String @id
  value String
}
`);

const file = "src/actions/x.actions.ts";
const auth = (source: string) => scanActionAuth(file, source);
const owner = (body: string, globals: string[] = []) =>
  scanOwnership(
    file,
    `"use server";\nexport async function act(id: string, input: any) {\n${body}\n}`,
    MINI_SCHEMA,
    globals,
  );
const USER = "const user = await requireUser();";

describe("scanActionAuth self-checks", () => {
  it("treats a commented directive as no directive", () => {
    expect(auth(`// "use server";\nexport async function a() {}`)).toEqual([]);
  });

  it("reads a module directive that follows a comment", () => {
    expect(auth(`// header\n"use server";\nexport async function a() {}`)).toEqual([
      { file, target: "a", check: "require-user" },
    ]);
  });

  it("checks an exported function with its own body directive", () => {
    const source = `
      export async function plain() {}
      export async function inline() { "use server"; }`;
    expect(auth(source)).toEqual([{ file, target: "inline", check: "require-user" }]);
  });

  it("skips re-export barrels and non-exported functions", () => {
    const source = `"use server";\nexport { a } from "./a";\nasync function hidden() {}`;
    expect(auth(source)).toEqual([]);
  });

  it("passes direct requireUser() and one level of same-file delegation", () => {
    const source = `"use server";
      const guarded = async () => { const user = await requireUser(); };
      async function deeper() { return guarded(); }
      export async function direct() { const user = await requireUser(); }
      export const viaHelper = async () => guarded();
      export async function twoLevels() { return deeper(); }
      export async function crossModule() { return importedGuarded(); }`;
    expect(auth(source)).toEqual([
      { file, target: "twoLevels", check: "require-user" },
      { file, target: "crossModule", check: "require-user" },
    ]);
  });

  it("reports server action exports it cannot resolve to a same-file function", () => {
    const source = `"use server";
      import { b } from "./b";
      export const a = wrap(async () => {});
      export { b };`;
    expect(auth(source)).toEqual([
      { file, target: "a", check: "unresolved-export" },
      { file, target: "b", check: "unresolved-export" },
    ]);
  });

  it("keeps a public-entry exception from covering a new protected export", () => {
    const source = `"use server";
      export async function signup() {}
      export async function newAction() {}`;
    const exceptions = [
      {
        file,
        target: "signup",
        check: "require-user",
        category: "public" as const,
        reason: "Sign-up has no session yet",
      },
    ];
    expect(applyExceptions(auth(source), exceptions)).toEqual({
      unexcepted: [{ file, target: "newAction", check: "require-user" }],
      stale: [],
    });
  });
});

describe("parseSchema self-checks", () => {
  it("reads past a brace inside a field default", () => {
    const schema = parseSchema(`
model UserSettings {
  id       String @id
  userId   String
  settings String @default("{}")
  updated  DateTime
}
`);
    expect([...schema.get("userSettings")!.fields.keys()]).toEqual([
      "id",
      "userId",
      "settings",
      "updated",
    ]);
  });
});

describe("scanOwnership self-checks", () => {
  it("passes inline and compound-key owner filters with a session-derived value", () => {
    expect(
      owner(`${USER}
        await prisma.job.findFirst({ where: { id, userId: user.id } });
        await prisma.tag.findUnique({ where: { value_createdBy: { value: "x", createdBy: user.id } } });
        const userId = user.id;
        await prisma.job.deleteMany({ where: { userId } });`),
    ).toEqual([]);
  });

  it("flags an id-only filter", () => {
    expect(owner(`await prisma.job.update({ where: { id }, data: {} });`)).toEqual([
      { file, target: "act:job.update#1", check: "owner-filter" },
    ]);
  });

  it("flags an owner key of unknown provenance or hidden in OR", () => {
    expect(
      owner(`${USER}
        await prisma.job.findMany({ where: { userId: input.userId } });
        await prisma.job.findMany({ where: { OR: [{ userId: user.id }, { id }] } });`),
    ).toEqual([
      { file, target: "act:job.findMany#1", check: "owner-value" },
      { file, target: "act:job.findMany#2", check: "owner-filter" },
    ]);
  });

  it("trusts an owner id passed into a helper but not into a server action", () => {
    const source = `"use server";
      const helper = async (userId: string) => {
        const owned = { createdBy: userId };
        await prisma.tag.count({ where: { id: "t", ...owned } });
      };
      export async function act(userId: string) { await prisma.job.findMany({ where: { userId } }); }`;
    expect(scanOwnership(file, source, MINI_SCHEMA, [])).toEqual([
      { file, target: "act:job.findMany#1", check: "owner-value" },
    ]);
  });

  it("flags an owner key overwritten by a later key", () => {
    expect(owner(`${USER}\nawait prisma.job.count({ where: { userId: user.id, userId: id } });`)).toEqual([
      { file, target: "act:job.count#1", check: "owner-value" },
    ]);
  });

  it("flags missing where, unresolved, mutated and unresolved-spread filters", () => {
    expect(
      owner(`${USER}
        await prisma.job.aggregate({ _count: true });
        await prisma.job.groupBy({ by: ["id"], where: buildWhere() });
        const mutated = { userId: user.id };
        mutated.userId = id;
        await prisma.job.findMany({ where: mutated });
        await prisma.job.findMany({ where: { id, ...input } });`),
    ).toEqual([
      { file, target: "act:job.aggregate#1", check: "no-where" },
      { file, target: "act:job.groupBy#1", check: "unresolved-where" },
      { file, target: "act:job.findMany#1", check: "unresolved-where" },
      { file, target: "act:job.findMany#2", check: "unresolved-where" },
    ]);
  });

  it("passes a constant owner filter and a resolvable owner spread", () => {
    expect(
      owner(`${USER}
        const owned = { userId: user.id };
        const where = { id, ...owned };
        await prisma.job.upsert({ where, create: {}, update: {} });
        await prisma.job.updateMany({ where: { id, ...owned }, data: {} });`),
    ).toEqual([]);
  });

  it("checks User by its id against the session user", () => {
    expect(
      owner(`${USER}
        await prisma.user.update({ where: { id: user.id }, data: {} });
        await prisma.user.findUnique({ where: { email: input.email } });`),
    ).toEqual([{ file, target: "act:user.findUnique#1", check: "owner-filter" }]);
  });

  it("requires the relation chain on a child model with no owner column", () => {
    expect(
      owner(`${USER}
        await prisma.jobStage.findFirst({ where: { id, Job: { userId: user.id } } });
        await prisma.jobStage.delete({ where: { id } });`),
    ).toEqual([{ file, target: "act:jobStage.delete#1", check: "owner-filter" }]);
  });

  it("exempts only listed global reference models", () => {
    const body = `await prisma.jobStatus.findMany({ where: { value: "x" } });`;
    expect(owner(body)).toEqual([
      { file, target: "act:jobStatus.findMany#1", check: "owner-filter" },
    ]);
    expect(owner(body, ["jobStatus"])).toEqual([]);
  });

  it("follows the session user into transaction callbacks and flags unknown delegates", () => {
    expect(
      owner(`${USER}
        await prisma.$transaction(async (tx) => {
          await tx.job.delete({ where: { id, userId: user.id } });
          await tx.ghost.findMany({});
          await client.job.findMany({ where: { userId: user.id } });
        });`),
    ).toEqual([
      { file, target: "act:ghost.findMany#1", check: "unresolved-call" },
      { file, target: "act:job.findMany#1", check: "unresolved-call" },
    ]);
  });

  it("does not count negated or vacuous filters as owner constraints", () => {
    expect(
      owner(`${USER}
        await prisma.job.findMany({ where: { NOT: { userId: user.id } } });
        await prisma.jobStage.findMany({ where: { Job: { isNot: { userId: user.id } } } });
        await prisma.job.findMany({ where: { stages: { every: { Job: { userId: user.id } } } } });
        await prisma.job.findMany({ where: { stages: { none: { Job: { userId: user.id } } } } });
        await prisma.jobStage.findMany({ where: { Job: { is: { userId: user.id } } } });
        await prisma.job.findMany({ where: { AND: [{ id }, { userId: user.id }] } });`),
    ).toEqual([
      { file, target: "act:job.findMany#1", check: "owner-filter" },
      { file, target: "act:jobStage.findMany#1", check: "owner-filter" },
      { file, target: "act:job.findMany#2", check: "owner-filter" },
      { file, target: "act:job.findMany#3", check: "owner-filter" },
    ]);
  });

  it("flags Prisma calls through a delegate variable or computed access", () => {
    const source = `
      export const list = async (model: any) => {
        await model.findMany({ where: { createdBy: "x" } });
        await model.count({ where: {} });
      };
      async function other() {
        const m = prisma.job;
        await m.delete({ where: { id: "x" } });
        await prisma["job"].deleteMany({});
        await hash.update("x");
      }`;
    expect(scanOwnership(file, source, MINI_SCHEMA, [])).toEqual([
      { file, target: "list:model.findMany#1", check: "unresolved-call" },
      { file, target: "list:model.count#1", check: "unresolved-call" },
      { file, target: "other:m.delete#1", check: "unresolved-call" },
      { file, target: 'other:prisma["job"].deleteMany#1', check: "unresolved-call" },
    ]);
  });

  it("does not trust shadowed users, callback parameters or optional session ids", () => {
    expect(
      owner(`${USER}
        input.ids.map((userId: string) => prisma.job.deleteMany({ where: { userId } }));
        input.users.forEach((user: any) => prisma.job.deleteMany({ where: { userId: user.id } }));
        for (const user of input.users) await prisma.job.deleteMany({ where: { userId: user.id } });
        const maybe = await getCurrentUser();
        await prisma.job.deleteMany({ where: { userId: maybe?.id } });
        await prisma.job.findMany({ where: { userId: user?.id } });`),
    ).toEqual([1, 2, 3, 4].map((n) => ({ file, target: `act:job.deleteMany#${n}`, check: "owner-value" })));
  });

  it("keeps an exception on one call from covering a second unsafe call", () => {
    const findings = owner(`
      await prisma.job.findFirst({ where: { id } });
      await prisma.job.findFirst({ where: { id } });`);
    const exceptions = [
      {
        file,
        target: "act:job.findFirst#1",
        check: "owner-filter",
        category: "contract-exception" as const,
        reason: "Checked against the session below",
      },
    ];
    expect(applyExceptions(findings, exceptions).unexcepted).toEqual([
      { file, target: "act:job.findFirst#2", check: "owner-filter" },
    ]);
    expect(applyExceptions([...findings, findings[0]], exceptions).stale).toHaveLength(1);
  });
});

const ACTIONS_DIR = path.join(process.cwd(), "src/actions");
const SCHEMA = parseSchema(fs.readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8"));

function actionFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return actionFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe("server actions in src/actions", () => {
  const files = actionFiles(ACTIONS_DIR)
    .map((full) => path.relative(process.cwd(), full).split(path.sep).join("/"))
    .sort();
  const globals = GLOBAL_MODELS.map((g) => g.model);
  const findings = files.flatMap((f) => {
    const source = fs.readFileSync(path.join(process.cwd(), f), "utf8");
    return [...scanActionAuth(f, source), ...scanOwnership(f, source, SCHEMA, globals)];
  });
  const { unexcepted, stale } = applyExceptions(findings, ACTION_EXCEPTIONS);

  it("parses the schema and finds the action files", () => {
    expect(SCHEMA.size).toBeGreaterThan(0);
    expect(files.length).toBeGreaterThan(0);
  });

  it("names only real schema models as global reference models", () => {
    expect(globals.filter((model) => !SCHEMA.has(model))).toEqual([]);
  });

  it("has no unreviewed auth or ownership findings", () => {
    expect(unexcepted).toEqual([]);
  });

  it("has no stale exceptions", () => {
    expect(stale).toEqual([]);
  });

  it("links every known gap to an issue note", () => {
    const gaps = ACTION_EXCEPTIONS.filter((e) => e.category === "known-gap");
    expect(gaps.filter((e) => !e.issue)).toEqual([]);
  });
});
