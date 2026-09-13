import { logger } from "../shared/logger";
import { createHash } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { DeviceTokenEntitySchema } from "../models/proverbStoreSchemas";
import { parseBody } from "../shared/parseBody";
import type { RegisterDeviceToken } from "./models/types";
import { EnvSchema } from "./schemas";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** Registers or updates a device FCM token by storing the token and platform.
 *  The sort key is a sha256 hash of the token. When a Cognito uuid is provided
 *  in the request body, the userId attribute is set on the record so the token
 *  persists across account operations (e.g. account deletion).
 *  Returns { success: true } on success. */
export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<{ statusCode: number; body: string }> => {
  const env = EnvSchema.parse(process.env);
  const body = parseBody<RegisterDeviceToken>(event, "token");

  const sk = createHash("sha256").update(body.token).digest("hex");

  const itemData: Record<string, unknown> = {
    pk: "device-token",
    sk,
    token: body.token,
    platform: body.platform,
    createdAt: new Date().toISOString(),
  };

  if (body.uuid) {
    itemData.userId = body.uuid;
  }

  const item = DeviceTokenEntitySchema.parse(itemData);

  logger.info("[register-device-token] Token registered:", {
    platform: body.platform,
  });

  await client.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: item as Record<string, unknown>,
    }),
  );

  logger.info("[register-device-token] Token stored successfully");

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
