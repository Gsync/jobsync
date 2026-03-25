import { z } from "zod";
import { validateOllamaUrl } from "@/lib/url-validation";

export const apiKeySaveSchema = z
  .object({
    provider: z.enum(["openai", "deepseek", "ollama", "rapidapi"]),
    key: z.string().min(1, "API key is required"),
    label: z.string().optional(),
    sensitive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.provider === "ollama") {
      const result = validateOllamaUrl(data.key);
      if (!result.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.error ?? "Invalid Ollama URL",
          path: ["key"],
        });
      }
    }
  });

export type ApiKeySaveInput = z.infer<typeof apiKeySaveSchema>;
