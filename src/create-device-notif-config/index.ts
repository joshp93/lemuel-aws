import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { createHash } from "crypto";
import { DeviceNotificationConfigEntitySchema } from "../models/proverbStoreSchemas";
import { EnvSchema, EventBodySchema } from "./schemas";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** Registers or updates a device notification configuration by storing the FCM token, platform, and opt-in status.
 *  The sort key is a sha256 hash of the token. Returns { success: true } on success. */
export const handler = async (event: {
  body?: string;
}): Promise<{ statusCode: number; body: string }> => {
  const env = EnvSchema.parse(process.env);
  const body = EventBodySchema.parse(JSON.parse(event.body ?? "{}"));

  const sk = createHash("sha256").update(body.token).digest("hex");

  const item = DeviceNotificationConfigEntitySchema.parse({
    pk: "device-notif-config",
    sk,
    token: body.token,
    platform: body.platform,
    notificationsEnabled: body.notificationsEnabled,
  });

  console.log("[create-device-notif-config] Config received:", {
    platform: body.platform,
    notificationsEnabled: body.notificationsEnabled,
  });

  await client.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: item as Record<string, unknown>,
    }),
  );

  console.log("[create-device-notif-config] Config stored successfully");

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
