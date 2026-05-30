import { z } from "zod";

export const CreateAccountEnvSchema = z.object({
  TABLE_NAME: z.string().min(1, "TABLE_NAME is required"),
});

export type CreateAccountEnv = z.infer<typeof CreateAccountEnvSchema>;

export const CreateAccountResponseSchema = z.object({
  success: z.literal(true),
});

export type CreateAccountResponse = z.infer<typeof CreateAccountResponseSchema>;
