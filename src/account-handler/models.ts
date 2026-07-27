import { z } from "zod";

export const AccountHandlerEnvSchema = z.object({
  TABLE_NAME: z.string().min(1, "TABLE_NAME is required"),
  USER_POOL_ID: z.string().min(1, "USER_POOL_ID is required"),
});

export type AccountHandlerEnv = z.infer<typeof AccountHandlerEnvSchema>;

export type CreateAccountResponse = { success: true };

export type UpdateMeditationsResponse = { success: true };
