import { z } from "zod";

/** Environment variables expected by the create-device-notif-config Lambda. */
export const EnvSchema = z.object({
  TABLE_NAME: z.string(),
});

/** Request body schema for POST /notifications/config. */
export const EventBodySchema = z.object({
  token: z.string(),
  platform: z.string(),
  notificationsEnabled: z.enum(["true", "false"]),
});