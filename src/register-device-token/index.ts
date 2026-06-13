import { createHash } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { DeviceTokenEntitySchema } from "../models/proverbStoreSchemas";
import { EnvSchema, EventBodySchema } from "./schemas";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** Registers or updates a device FCM token by storing the token and platform.
 *  The sort key is a sha256 hash of the token. Returns { success: true } on success. */
export const handler = async (event: {
  body?: string;
}): Promise<{ statusCode: number; body: string }> => {
  const env = EnvSchema.parse(process.env);
  const body = EventBodySchema.parse(JSON.parse(event.body ?? "{}"));

  const sk = createHash("sha256").update(body.token).digest("hex");

  const item = DeviceTokenEntitySchema.parse({
    pk: "device-token",
    sk,
    token: body.token,
    platform: body.platform,
    createdAt: new Date().toISOString(),
  });

  console.log("[register-device-token] Token registered:", {
    platform: body.platform,
  });

  await client.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: item as Record<string, unknown>,
    }),
  );

  console.log("[register-device-token] Token stored successfully");

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
