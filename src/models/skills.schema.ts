import { z } from "zod";
import { APP_CONSTANTS } from "@/lib/constants";

const SkillCategorySchema = z.object({
  label: z.string().trim().max(60).optional(),
  tagIds: z
    .array(z.string())
    .min(1, "Add at least one skill")
    .max(APP_CONSTANTS.MAX_SKILLS_PER_CATEGORY),
});

export const AddSkillsFormSchema = z.object({
  resumeId: z.string(),
  sectionTitle: z.string().trim().min(1, "Section title is required"),
  categories: z
    .array(SkillCategorySchema)
    .min(1, "Add at least one category")
    .max(APP_CONSTANTS.MAX_SKILL_CATEGORIES),
});

export const UpdateSkillsFormSchema = AddSkillsFormSchema.extend({
  sectionId: z.string(),
});

export type AddSkillsForm = z.infer<typeof AddSkillsFormSchema>;
export type UpdateSkillsForm = z.infer<typeof UpdateSkillsFormSchema>;
