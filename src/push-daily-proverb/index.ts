import { queryAllDeviceTokens } from "../shared/deviceTokens";
import { sendToAllTokens } from "../shared/fcm";
import { DynamoDBStreamEventSchema, EnvSchema } from "./schemas";

/** Handler triggered by DynamoDB Stream on daily-proverb INSERT. Sends a silent FCM data message
 *  (type: "daily-proverb") with the proverb ref to all registered devices. */
export const handler = async (event: unknown): Promise<void> => {
  const env = EnvSchema.parse(process.env);
  const parsed = DynamoDBStreamEventSchema.parse(event);

  const record = parsed.Records[0];
  if (!record) return;

  if (record.eventName !== "INSERT") {
    console.log(
      "[push-daily-proverb] Skipping: eventName is",
      record.eventName,
    );
    return;
  }

  const keys = record.dynamodb.Keys;
  if (keys.pk.S !== "daily-proverb") {
    console.log("[push-daily-proverb] Skipping: pk is", keys.pk.S);
    return;
  }

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  if (keys.sk.S !== tomorrow) {
    console.log(
      "[push-daily-proverb] Skipping: sk is",
      keys.sk.S,
      "expected",
      tomorrow,
    );
    return;
  }

  const ref = record.dynamodb.NewImage?.ref?.S;
  if (!ref) {
    console.log("[push-daily-proverb] Skipping: no ref in NewImage");
    return;
  }

  console.log("[push-daily-proverb] Pushing silent update for:", ref);

  const tokens = await queryAllDeviceTokens(env.TABLE_NAME);
  if (tokens.length === 0) {
    console.log("[push-daily-proverb] No registered devices, skipping");
    return;
  }

  console.log("[push-daily-proverb] Sending to", tokens.length, "devices");

  const message = {
    data: {
      type: "daily-proverb",
    },
    android: {
      priority: "high" as const,
    },
    apns: {
      headers: {
        "apns-priority": "10",
      },
      payload: {
        aps: {
          "content-available": 1,
        },
      },
    },
  };

  await sendToAllTokens(
    tokens.map((t) => t.token),
    message,
    process.env.FCM_SECRET_NAME!,
  );

  console.log("[push-daily-proverb] Silent push complete");
};
