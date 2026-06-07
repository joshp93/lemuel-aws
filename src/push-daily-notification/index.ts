import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { queryEnabledDeviceTokens } from "../shared/deviceTokens";
import { getAccessToken, getFcmCreds, sendToAllTokens } from "../shared/fcm";
import { EnvSchema } from "./schemas";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** Handler triggered by EventBridge cron at 12:00 UTC. Sends a visible FCM notification
 *  to all opted-in devices with the daily proverb ref. The notification body inserts a space
 *  before the chapter number (e.g. "Proverbs 29:14"). */
export const handler = async (): Promise<void> => {
  const env = EnvSchema.parse(process.env);

  const today = new Date().toISOString().split("T")[0];

  const result = await client.send(
    new GetCommand({
      TableName: env.TABLE_NAME,
      Key: { pk: "daily-proverb", sk: today },
    }),
  );

  const ref = result.Item?.ref as string | undefined;
  if (!ref) {
    console.log("[push-daily-notification] No daily-proverb found for", today);
    return;
  }

  const body = ref.replace(/(\d+:)/, " $1");

  console.log("[push-daily-notification] Sending notification for:", ref);

  const tokens = await queryEnabledDeviceTokens(env.TABLE_NAME);
  if (tokens.length === 0) {
    console.log("[push-daily-notification] No opted-in devices, skipping");
    return;
  }

  console.log("[push-daily-notification] Sending to", tokens.length, "opted-in devices");

  const message = {
    notification: {
      title: "Daily Proverb Meditation",
      body: `Tap to begin meditation on ${body}`,
    },
    data: {
      type: "daily-notification",
      ref,
    },
  };

  const credentials = await getFcmCreds(env.FCM_SECRET_NAME);
  const accessToken = await getAccessToken(credentials);

  await sendToAllTokens(
    tokens.map((t) => t.token),
    message,
    credentials.project_id,
  );

  console.log("[push-daily-notification] Notification push complete");
};
