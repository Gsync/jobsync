import { z } from "zod";
import { JOB_STATUS_VALUES } from "@/lib/constants";
import { entityLabelValue } from "@/lib/jobs/canonicalize";
import {
  JOB_TYPES,
  WORKPLACE_TYPES,
  matchEnumEntry,
  type DescriptionCompleteness,
} from "@/models/job.model";

export type ApiV1ErrorResponse = { error: string };

export type ApiV1PingResponse = {
  app: "jobsync";
  version: string;
  tokenName: string;
  tokenExpiresAt: string;
  scopes: string[];
};

// Entity names stay under the (value, createdBy) unique index's size cap.
const NAME_MAX = 200;

const blankToUndefined = (v: string) => (v === "" ? undefined : v);

// Postgres text rejects NUL, so it is a 400 here rather than a 500 on write.
function text(field: string, opts: { required?: boolean; max?: number } = {}) {
  let schema = z.string().trim();
  if (opts.required) {
    schema = schema.min(1, { message: `${field} is required`, abort: true });
  }
  if (opts.max !== undefined) {
    schema = schema.max(opts.max, `${field} must be at most ${opts.max} characters`);
  }
  return schema.refine((v) => !v.includes("\u0000"), `${field} must not contain NUL characters`);
}

// Blank passes so an optional field can fall through to undefined.
function usableName(field: string, opts?: { stripLegalSuffix?: boolean }) {
  return [
    (v: string) => v === "" || entityLabelValue(v, opts) !== "",
    `${field} is not a usable name`,
  ] as const;
}

function optionalName(field: string) {
  return text(field, { max: NAME_MAX })
    .refine(...usableName(field))
    .transform(blankToUndefined)
    .optional();
}

// Plain z.object strips unknown keys; .strict() would break the v1 promise.
export const ApiV1AddJobSchema = z.object({
  company: text("company", { required: true, max: NAME_MAX }).refine(
    ...usableName("company", { stripLegalSuffix: true }),
  ),
  jobTitle: text("jobTitle", { required: true, max: NAME_MAX }).refine(
    ...usableName("jobTitle"),
  ),
  jobDescription: text("jobDescription", { max: 50_000 })
    .transform((v) => (v === "" ? "N/A" : v))
    .default("N/A"),
  jobUrl: text("jobUrl")
    .transform(blankToUndefined)
    .pipe(
      z
        .url({ protocol: /^https?$/, message: "jobUrl must be an http or https URL" })
        .optional(),
    )
    .optional(),
  location: optionalName("location"),
  source: optionalName("source"),
  jobType: text("jobType")
    .transform((v) => (v === "" ? undefined : (matchEnumEntry(JOB_TYPES, v)?.[1] ?? v)))
    .pipe(z.enum(JOB_TYPES).optional())
    .optional(),
  workplaceType: text("workplaceType")
    .transform((v) => (v === "" ? undefined : (matchEnumEntry(WORKPLACE_TYPES, v)?.[1] ?? v)))
    .pipe(z.enum(WORKPLACE_TYPES).optional())
    .optional(),
  salaryRange: text("salaryRange").transform(blankToUndefined).optional(),
  status: text("status")
    .transform((v) => (v === "" ? undefined : v.toLowerCase()))
    .pipe(z.enum(JOB_STATUS_VALUES).optional())
    .optional(),
  allowDuplicate: z.boolean().optional(),
  via: text("via", { max: 50 }).transform(blankToUndefined).optional(),
});

export type ApiV1AddJobInput = z.output<typeof ApiV1AddJobSchema>;

export type ApiV1Issue = { path: string; message: string };

export type ApiV1ValidationError = { error: "Invalid request"; issues: ApiV1Issue[] };

export type ApiV1AddJobCreated = {
  created: true;
  jobId: string;
  jobPath: string;
  descriptionCompleteness: DescriptionCompleteness;
};

export type ApiV1AddJobDuplicate = {
  created: false;
  duplicateOf: { id: string; title: string; company: string };
  jobPath: string;
};

export type ApiV1RateLimited = { error: "Rate limit exceeded"; retryAfterSeconds: number };
