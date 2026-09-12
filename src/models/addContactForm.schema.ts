import { z } from "zod";

const isValidHttpUrl = (url: string) => {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
};

const optionalText = (max: number) => z.string().max(max).default("").optional();

export const AddContactFormSchema = z
  .object({
    id: z.string().optional(),
    name: z
      .string({ error: "Contact name is required." })
      .min(1, { message: "Contact name cannot be empty." })
      .max(120, { message: "Contact name must be 120 characters or fewer." }),
    title: optionalText(120),
    email: z
      .string()
      .default("")
      .optional()
      .refine(
        (v) => !v || z.email().safeParse(v).success,
        "Please enter a valid email address.",
      ),
    phone: optionalText(40),
    linkedinUrl: z
      .string()
      .default("")
      .optional()
      .refine(
        (url) => !url || isValidHttpUrl(url),
        "Please enter a full LinkedIn URL starting with https://",
      ),
    company: z.string().optional(),
    location: z.string().optional(),
    relationship: optionalText(120),
    workedAtCompany: z.string().optional(),
    workedFrom: z.date().nullable().optional(),
    workedTo: z.date().nullable().optional(),
    // Named for ComboBox's `case "contactRole"` create path, not for the column
    contactRole: z.string().optional(),
    notes: optionalText(2000),
    lastContactedAt: z.date().nullable().optional(),
  })
  .refine(
    (v) => !v.workedFrom || !v.workedTo || v.workedTo >= v.workedFrom,
    { message: "The end date cannot be before the start date.", path: ["workedTo"] },
  );

export type ContactFormValues = z.infer<typeof AddContactFormSchema>;
