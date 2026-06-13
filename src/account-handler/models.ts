import { z } from "zod";

export const AccountHandlerEnvSchema = z.object({
  TABLE_NAME: z.string().min(1, "TABLE_NAME is required"),
});

export type AccountHandlerEnv = z.infer<typeof AccountHandlerEnvSchema>;

export type CreateAccountResponse = { success: true };

export type UpdateMeditationsResponse = { success: true };
