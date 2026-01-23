import { z } from "zod";

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const AddCompanyFormSchema = z.object({
  id: z.string().optional(),
  createdBy: z.string().optional(),
  company: z
    .string({
      error: "Company name is required.",
    })
    .min(1),
  logoUrl: z
    .string()
    .default("")
    .optional()
    .refine(
      (url) => !url || isValidUrl(url),
      "Please enter a valid URL (e.g., https://example.com/logo.png)",
    ),
});
