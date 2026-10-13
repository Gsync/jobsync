import { UNANALYZED_MATCH_MARKER } from "@/actions/job/shared";
import { getTagList } from "@/actions/tag.actions";
import { getDiscoveredJobs } from "@/actions/automation/discoveredJobs";
import { getAutomationRuns } from "@/actions/automation/runs";
import { getAutomationsList } from "@/actions/automation/queries";
import { getQuestionsList } from "@/actions/question.actions";
import { getContactList } from "@/actions/contact/queries";
import { getResumeList, getResumeById } from "@/actions/profile/resume";
import { getTasksList } from "@/actions/task/queries";
import { getReferenceEntityList } from "@/actions/referenceList";
import { getInterviewList } from "@/actions/interview.actions";
import { getActivitiesList } from "@/actions/activity/activities";
import { getCoverLetterList } from "@/actions/coverLetter.actions";
import { getContactRoleList } from "@/actions/contactRole.actions";
import { getJobStageTypeList } from "@/actions/jobStageType.actions";
import { getJobsList, getJobsIterator } from "@/actions/job/queries";
import prisma from "@/lib/db";

type Call = { model: string; method: string; args: any };

const h = vi.hoisted(() => ({
  calls: [] as { model: string; method: string; args: any }[],
  returns: {} as Record<string, unknown>,
}));

// Every delegate method records its call and returns an empty result, so a
// site can be driven without hand-listing the methods it happens to use.
vi.mock("@/lib/db", () => {
  const empty = (method: string) =>
    method === "count" ? 0 : method === "findMany" || method === "groupBy" ? [] : null;
  const delegates: Record<string, unknown> = {};
  const delegate = (model: string) =>
    new Proxy(
      {},
      {
        get: (_target, method: string) => async (args: any) => {
          h.calls.push({ model, method, args });
          const key = `${model}.${method}`;
          if (!(key in h.returns)) return empty(method);
          const value = h.returns[key];
          return typeof value === "function" ? value(args) : value;
        },
      },
    );
  return {
    default: new Proxy(
      {},
      { get: (_target, model: string) => (delegates[model] ??= delegate(model)) },
    ),
  };
});

vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: async () => ({ id: "user-1" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

const findManyCalls = (model: string): Call[] =>
  h.calls.filter((c) => c.model === model && c.method === "findMany");

// Every { contains } object anywhere inside a where clause
const containsFilters = (node: unknown, found: any[] = []): any[] => {
  if (Array.isArray(node)) node.forEach((n) => containsFilters(n, found));
  else if (node && typeof node === "object") {
    if ("contains" in node) found.push(node);
    Object.values(node).forEach((n) => containsFilters(n, found));
  }
  return found;
};

const lastKey = (orderBy: unknown) => {
  const list = Array.isArray(orderBy) ? orderBy : [orderBy];
  return list[list.length - 1];
};

beforeEach(() => {
  h.calls.length = 0;
  for (const key of Object.keys(h.returns)) delete h.returns[key];
});

describe("search parity: user search is case-insensitive", () => {
  const sites: [string, string, () => Promise<unknown>][] = [
    ["tags", "tag", () => getTagList(1, 10, "Goo")],
    ["questions", "question", () => getQuestionsList(1, 10, undefined, "Goo")],
    ["contacts", "contact", () => getContactList(1, 10, "Goo")],
    ["tasks", "task", () => getTasksList(1, 10, undefined, undefined, "Goo")],
    ["activities", "activity", () => getActivitiesList(1, 10, "Goo")],
    ["contact roles", "contactRole", () => getContactRoleList(1, 10, "Goo")],
    ["stage types", "jobStageType", () => getJobStageTypeList(1, 10, "Goo")],
    ["jobs", "job", () => getJobsList(1, 10, undefined, "Goo")],
    [
      "reference lists",
      "company",
      () =>
        getReferenceEntityList({
          model: (prisma as any).company,
          userId: "user-1",
          fkField: "companyId",
          appliedRelation: "jobsApplied",
          page: 1,
          limit: 10,
          search: "Goo",
        }),
    ],
  ];

  it.each(sites)("%s", async (_name, model, run) => {
    await run();
    const filters = findManyCalls(model).flatMap((c) => containsFilters(c.args.where));
    expect(filters.length).toBeGreaterThan(0);
    for (const filter of filters) {
      expect(filter).toEqual({ contains: "Goo", mode: "insensitive" });
    }
  });

  it("interviews", async () => {
    h.returns["jobStage.count"] = 1;
    await getInterviewList(1, 10, "Goo");
    const filters = findManyCalls("jobStage").flatMap((c) => containsFilters(c.args.where));
    expect(filters).toHaveLength(4);
    for (const filter of filters) {
      expect(filter).toEqual({ contains: "Goo", mode: "insensitive" });
    }
  });

  it("leaves the app-written unanalyzed marker case-sensitive", async () => {
    h.returns["job.count"] = 1;
    await getJobsList(1, 10, undefined, undefined, undefined, undefined, undefined, undefined, undefined, {
      field: "matchScore",
      dir: "desc",
    });
    const markers = h.calls
      .filter((c) => c.model === "job")
      .flatMap((c) => containsFilters(c.args?.where))
      .filter((f) => f.contains === UNANALYZED_MATCH_MARKER);
    expect(markers.length).toBeGreaterThan(0);
    for (const marker of markers) expect(marker).not.toHaveProperty("mode");
  });
});

describe("NULL ordering parity", () => {
  it("keeps undated tasks first in the due-date grouping", async () => {
    await getTasksList(1, 10, undefined, undefined, undefined, "dueDate");
    const [call] = findManyCalls("task");
    expect(call.args.orderBy[0]).toEqual({ dueDate: { sort: "asc", nulls: "first" } });
  });
});

describe("pagination tiebreaker: every paged sort ends on id", () => {
  const sites: [string, string, () => Promise<unknown>][] = [
    ["tags", "tag", () => getTagList()],
    ["discovered jobs", "job", () => getDiscoveredJobs()],
    ["questions", "question", () => getQuestionsList()],
    ["contacts", "contact", () => getContactList()],
    ["automations", "automation", () => getAutomationsList()],
    ["resumes", "resume", () => getResumeList()],
    ["activities", "activity", () => getActivitiesList()],
    ["cover letters", "coverLetter", () => getCoverLetterList()],
    ["contact roles", "contactRole", () => getContactRoleList()],
    ["stage types", "jobStageType", () => getJobStageTypeList()],
    [
      "reference lists",
      "company",
      () =>
        getReferenceEntityList({
          model: (prisma as any).company,
          userId: "user-1",
          fkField: "companyId",
          appliedRelation: "jobsApplied",
          page: 1,
          limit: 10,
        }),
    ],
    [
      "watchlist order passed in by the caller",
      "company",
      () =>
        getReferenceEntityList({
          model: (prisma as any).company,
          userId: "user-1",
          fkField: "companyId",
          appliedRelation: "jobsApplied",
          orderBy: [{ watchedAt: "desc" }, { label: "asc" }],
          page: 1,
          limit: 10,
        }),
    ],
  ];

  it.each(sites)("%s", async (_name, model, run) => {
    await run();
    const calls = findManyCalls(model).filter((c) => "take" in c.args);
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) expect(lastKey(call.args.orderBy)).toEqual({ id: "desc" });
  });

  it.each(["dueDate", "createdDate", "updatedDate", "activityType", undefined] as const)(
    "tasks grouped by %s",
    async (groupBy) => {
      await getTasksList(1, 10, undefined, undefined, undefined, groupBy as any);
      const [call] = findManyCalls("task");
      expect(lastKey(call.args.orderBy)).toEqual({ id: "desc" });
    },
  );

  it("automation runs", async () => {
    h.returns["automation.findFirst"] = { id: "auto-1" };
    await getAutomationRuns("auto-1");
    const [call] = findManyCalls("automationRun");
    expect(lastKey(call.args.orderBy)).toEqual({ id: "desc" });
  });

  it("resumes with a pinned default, on both pages", async () => {
    h.returns["user.findUnique"] = { defaultResumeId: "resume-1" };
    await getResumeList(1, 10);
    await getResumeList(2, 10);
    const calls = findManyCalls("resume");
    expect(calls).toHaveLength(2);
    for (const call of calls) expect(lastKey(call.args.orderBy)).toEqual({ id: "desc" });
  });

  it("interviews, dated and undated halves", async () => {
    h.returns["jobStage.count"] = (args: any) =>
      args.where.AND?.some((c: any) => c.occurredAt?.not === null) ? 1 : 3;
    await getInterviewList(1, 10);
    const calls = findManyCalls("jobStage");
    expect(calls).toHaveLength(2);
    for (const call of calls) expect(lastKey(call.args.orderBy)).toEqual({ id: "desc" });
  });

  it("the job export iterator", async () => {
    for await (const _chunk of getJobsIterator()) break;
    const [call] = findManyCalls("job");
    expect(lastKey(call.args.orderBy)).toEqual({ id: "desc" });
  });
});

describe("unordered reads: resume entries carry an explicit order", () => {
  it("orders every entry relation on the resume detail read", async () => {
    await getResumeById("resume-1");
    const call = h.calls.find((c) => c.model === "resume" && c.method === "findUnique")!;
    const sections = call.args.include.ResumeSections;
    expect(sections.orderBy).toEqual({ id: "asc" });
    expect(sections.include.workExperiences.orderBy).toEqual([{ createdAt: "asc" }, { id: "asc" }]);
    expect(sections.include.educations.orderBy).toEqual([{ createdAt: "asc" }, { id: "asc" }]);
    expect(sections.include.licenseOrCertifications.orderBy).toEqual([
      { issueDate: { sort: "desc", nulls: "last" } },
      { title: "asc" },
      { id: "asc" },
    ]);
  });
});
