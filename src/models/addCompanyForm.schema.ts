import { z } from "zod";

export const AddCompanyFormSchema = z.object({
  id: z.string().optional(),
  createdBy: z.string().optional(),
  company: z.string({
    required_error: "Company name is required.",
  }),
  logoUrl: z.string().optional(),
});
