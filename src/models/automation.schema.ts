import { z } from "zod";
import { APP_CONSTANTS } from "@/lib/constants";
import { isAtsBoard } from "./automation.model";
// Deep-import (NOT the barrel) — utils.ts is pure; the barrel pulls scraper
// network code into the client bundle via this file's client consumers.
import { ATS_TOKEN_REGEX } from "@/lib/scraper/utils";

export const JobBoardSchema = z.enum(["jsearch", "greenhouse", "lever"]);

export const AutomationStatusSchema = z.enum(["active", "paused"]);

export const AutomationRunStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
  "completed_with_errors",
  "blocked",
  "rate_limited",
]);

export const DiscoveryStatusSchema = z.enum(["new", "accepted", "dismissed"]);

export const GreenhouseCompanySchema = z.object({
  name: z.string().min(1).max(200),
  token: z.string().min(1).max(80),
});

export const GreenhouseSourceConfigSchema = z.object({
  companies: z
    .array(GreenhouseCompanySchema)
    .max(APP_CONSTANTS.MAX_GREENHOUSE_COMPANIES),
  targetTitles: z.array(z.string().min(1).max(100)).optional(),
  keywords: z.array(z.string().min(1).max(100)).optional(),
  locations: z.array(z.string().min(1).max(100)).optional(),
  strictLocation: z.boolean().optional(),
  topK: z.number().int().min(1).max(APP_CONSTANTS.GREENHOUSE_LISTING_CAP).optional(),
  saveUnanalyzed: z.boolean().optional(),
});

// Override `token` with the allowlist regex so a directly-POSTed Lever config
// can't smuggle a malformed token past the save boundary.
export const LeverCompanySchema = GreenhouseCompanySchema.extend({
  token: z.string().regex(ATS_TOKEN_REGEX),
  host: z.enum(["default", "eu"]).optional(),
});

// Same fields/MAX/cap as Greenhouse, `companies` swapped to LeverCompanySchema.
export const LeverSourceConfigSchema = GreenhouseSourceConfigSchema.extend({
  companies: z
    .array(LeverCompanySchema)
    .max(APP_CONSTANTS.MAX_GREENHOUSE_COMPANIES),
});

export const SourceConfigSchema = z.object({
  greenhouse: GreenhouseSourceConfigSchema.optional(),
  lever: LeverSourceConfigSchema.optional(),
});

export const CreateAutomationSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    jobBoard: JobBoardSchema,
    keywords: z.string().max(200).optional(),
    location: z.string().max(100).optional(),
    sourceConfig: SourceConfigSchema.optional(),
    resumeId: z.string().uuid("Invalid resume"),
    matchThreshold: z.number().min(0).max(100),
    scheduleHour: z.number().min(0).max(23),
  })
  .superRefine((data, ctx) => {
    if (data.jobBoard === "jsearch") {
      if (!data.keywords || data.keywords.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["keywords"],
          message: "Keywords are required",
        });
      }
      if (!data.location || data.location.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["location"],
          message: "Location is required",
        });
      }
    }

    if (isAtsBoard(data.jobBoard)) {
      const atsKey = data.jobBoard as "greenhouse" | "lever";
      const companies = data.sourceConfig?.[atsKey]?.companies ?? [];
      if (companies.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sourceConfig", atsKey, "companies"],
          message: "Select at least one company",
        });
      }
    }
  });

export const UpdateAutomationSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    jobBoard: JobBoardSchema.optional(),
    keywords: z.string().max(200).optional(),
    location: z.string().max(100).optional(),
    sourceConfig: SourceConfigSchema.optional(),
    resumeId: z.string().uuid("Invalid resume").optional(),
    matchThreshold: z.number().min(0).max(100).optional(),
    scheduleHour: z.number().min(0).max(23).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.jobBoard && isAtsBoard(data.jobBoard)) {
      const atsKey = data.jobBoard as "greenhouse" | "lever";
      const companies = data.sourceConfig?.[atsKey]?.companies ?? [];
      if (companies.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sourceConfig", atsKey, "companies"],
          message: "Select at least one company",
        });
      }
    }
  });

export type CreateAutomationInput = z.infer<typeof CreateAutomationSchema>;
export type UpdateAutomationInput = z.infer<typeof UpdateAutomationSchema>;
export type SourceConfigInput = z.infer<typeof SourceConfigSchema>;
export type GreenhouseSourceConfigInput = z.infer<
  typeof GreenhouseSourceConfigSchema
>;
