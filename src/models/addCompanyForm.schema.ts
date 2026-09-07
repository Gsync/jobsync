import { z } from "zod";

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Absolute http(s) only. Deliberately not a flag on isValidUrl: a logo may be
// a bundled asset like /icons/logo.svg, an employer's website never is.
const isValidHttpUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const httpUrlField = (label: string) =>
  z
    .string()
    .default("")
    .optional()
    .refine(
      (url) => !url || isValidHttpUrl(url),
      `Please enter a full ${label} URL starting with https://`,
    );

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
      (url) => !url || url.startsWith("/") || isValidUrl(url),
      "Please enter a valid URL (e.g., https://example.com/logo.png or /icons/logo.svg)",
    ),
  websiteUrl: httpUrlField("website"),
  careersUrl: httpUrlField("careers page"),
  industry: z.string().default("").optional(),
});
