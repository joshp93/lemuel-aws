import { z } from "zod";

/** Environment variables expected by the push-daily-notification Lambda. */
export const EnvSchema = z.object({
  TABLE_NAME: z.string(),
  FCM_SECRET_NAME: z.string(),
});
