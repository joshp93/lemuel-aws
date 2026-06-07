import { z } from "zod";

/** Environment variables expected by the register-device-token Lambda. */
export const EnvSchema = z.object({
  TABLE_NAME: z.string(),
});

/** Request body schema for POST /push/register-token. */
export const EventBodySchema = z.object({
  token: z.string(),
  platform: z.string(),
});
