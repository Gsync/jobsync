import { z } from "zod";

export const JobBoardSchema = z.enum(["jsearch"]);

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

export const CreateAutomationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  jobBoard: JobBoardSchema,
  keywords: z.string().min(1, "Keywords are required").max(200),
  location: z.string().min(1, "Location is required").max(100),
  resumeId: z.string().uuid("Invalid resume"),
  matchThreshold: z.number().min(0).max(100),
  scheduleHour: z.number().min(0).max(23),
});

export const UpdateAutomationSchema = CreateAutomationSchema.partial();

export type CreateAutomationInput = z.infer<typeof CreateAutomationSchema>;
export type UpdateAutomationInput = z.infer<typeof UpdateAutomationSchema>;
