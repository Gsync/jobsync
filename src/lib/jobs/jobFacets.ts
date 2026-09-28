import { JOB_STATUS_VALUES } from "@/lib/constants";
import { JOB_TYPES, JobFacets, WORKPLACE_TYPES } from "@/models/job.model";

export const EMPTY_JOB_FACETS: JobFacets = {
  statuses: [],
  acceptedDiscovered: false,
  jobTypes: [],
  workplaces: [],
  includeDismissed: false,
};

const PARAM = {
  statuses: "status",
  acceptedDiscovered: "accepted",
  jobTypes: "type",
  workplaces: "workplace",
  includeDismissed: "dismissed",
} as const;

const JOB_TYPE_CODES = Object.keys(JOB_TYPES);
const WORKPLACE_CODES = Object.keys(WORKPLACE_TYPES);

// Filtering the whitelist (not the input) dedupes and fixes the order.
const pick = (values: readonly string[] | undefined, allowed: string[]) =>
  allowed.filter((value) => values?.includes(value));

export function normalizeJobFacets(
  input?: Partial<JobFacets> | null,
): JobFacets {
  return {
    statuses: pick(input?.statuses, JOB_STATUS_VALUES),
    acceptedDiscovered: input?.acceptedDiscovered === true,
    jobTypes: pick(input?.jobTypes, JOB_TYPE_CODES),
    workplaces: pick(input?.workplaces, WORKPLACE_CODES),
    includeDismissed: input?.includeDismissed === true,
  };
}

const readList = (params: URLSearchParams, key: string) =>
  params.get(key)?.split(",") ?? [];

export function parseJobFacets(params: URLSearchParams): JobFacets {
  return normalizeJobFacets({
    statuses: readList(params, PARAM.statuses),
    acceptedDiscovered: params.get(PARAM.acceptedDiscovered) === "1",
    jobTypes: readList(params, PARAM.jobTypes),
    workplaces: readList(params, PARAM.workplaces),
    includeDismissed: params.get(PARAM.includeDismissed) === "1",
  });
}

export function writeJobFacets(
  params: URLSearchParams,
  facets: JobFacets,
): URLSearchParams {
  const next = new URLSearchParams(params);
  const setList = (key: string, values: string[]) =>
    values.length ? next.set(key, values.join(",")) : next.delete(key);
  const setFlag = (key: string, on: boolean) =>
    on ? next.set(key, "1") : next.delete(key);

  setList(PARAM.statuses, facets.statuses);
  setFlag(PARAM.acceptedDiscovered, facets.acceptedDiscovered);
  setList(PARAM.jobTypes, facets.jobTypes);
  setList(PARAM.workplaces, facets.workplaces);
  setFlag(PARAM.includeDismissed, facets.includeDismissed);
  return next;
}

export const countJobFacets = (facets: JobFacets) =>
  facets.statuses.length +
  facets.jobTypes.length +
  facets.workplaces.length +
  Number(facets.acceptedDiscovered) +
  Number(facets.includeDismissed);

export const hasJobFacets = (facets: JobFacets) => countJobFacets(facets) > 0;
