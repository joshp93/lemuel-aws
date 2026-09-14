import { queryAllDeviceTokens } from "../shared/deviceTokens";
import { getAccessToken, getFcmCreds } from "../shared/fcm";
import { logger } from "../shared/logger";
import { parseDdbRecord } from "../shared/parseDdbRecord";
import { buildSilentPushMessage } from "./buildSilentPushMessage";
import { EnvSchema } from "./schemas";
import { sendToAllDevices } from "./sendToAllDevices";
import type { DailyProverbImage } from "./types";

/** Responds to DynamoDB Stream INSERT events for tomorrow's daily-proverb
 *  record. Sends a silent data-only FCM push to every registered device so
 *  the client app can pre-fetch the next day's proverb via background task.
 *
 *  Records that do not match the daily-proverb shape for tomorrow's date are
 *  silently skipped so other stream consumers are not interfered with. */
export const handler = async (event: unknown): Promise<void> => {
  const env = EnvSchema.parse(process.env);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const rawRecords: unknown[] =
    (event as { Records?: unknown[] }).Records ?? [];

  for (const rawRecord of rawRecords) {
    const parsed = parseDdbRecord<DailyProverbImage>(
      rawRecord,
      ["ref"],
      "daily-proverb",
    );

    if (!parsed?.newImage) {
      continue;
    }

    if (parsed.sk !== tomorrow) {
      continue;
    }

    const ref = parsed.newImage.ref;
    logger.info("[push-daily-proverb] Pushing silent update for:", ref);

    const tokens = await queryAllDeviceTokens(env.TABLE_NAME);
    if (tokens.length === 0) {
      logger.info("[push-daily-proverb] No registered devices, skipping");
      return;
    }

    logger.info("[push-daily-proverb] Sending to devices", {
      count: tokens.length,
    });

    const credentials = await getFcmCreds(env.FCM_SECRET_NAME);
    const accessToken = await getAccessToken(credentials);
    if (!accessToken) {
      logger.error("[push-daily-proverb] Failed to obtain FCM access token");
      return;
    }

    const message = buildSilentPushMessage();
    const cleanedCount = await sendToAllDevices(
      tokens.map((t) => t.token),
      message,
      credentials.project_id,
      accessToken,
      env.TABLE_NAME,
    );

    logger.info(
      "[push-daily-proverb] Silent push complete, cleaned stale tokens",
      { count: cleanedCount },
    );
  }
};
