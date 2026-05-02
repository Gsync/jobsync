import { z } from "zod";

export const apiKeySaveSchema = z.object({
  provider: z.enum(["openai", "deepseek", "openrouter", "ollama", "gemini", "rapidapi"]),
  key: z.string().min(1, "API key is required"),
  label: z.string().optional(),
  sensitive: z.boolean().default(true),
});

export type ApiKeySaveInput = z.infer<typeof apiKeySaveSchema>;
