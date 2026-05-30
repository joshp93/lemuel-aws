import { z } from "zod";

export const GetAccountDetailsEnvSchema = z.object({
  TABLE_NAME: z.string().min(1, "TABLE_NAME is required"),
});

export type GetAccountDetailsEnv = z.infer<typeof GetAccountDetailsEnvSchema>;
