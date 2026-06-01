import { z } from "zod";

export const NoteHandlerEnvSchema = z.object({
  TABLE_NAME: z.string().min(1, "TABLE_NAME is required"),
});

export type NoteHandlerEnv = z.infer<typeof NoteHandlerEnvSchema>;