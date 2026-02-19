import { z } from "zod";

export const apiKeySaveSchema = z.object({
  provider: z.enum(["openai", "deepseek", "ollama", "rapidapi"]),
  key: z.string().min(1, "API key is required"),
  label: z.string().optional(),
});

export type ApiKeySaveInput = z.infer<typeof apiKeySaveSchema>;
