import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { linkDeviceToken } from "../../shared/deviceTokens";
import { parseBody } from "../../shared/parseBody";
import type { AccountHandlerEnv } from "../models";
import type { DeviceToken } from "./models/types";
import { logger } from "../../shared/logger";

export const linkDeviceTokenHandler = async (
  client: DynamoDBDocumentClient,
  env: AccountHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const uuid = event.pathParameters!.uuid!;
    const body = parseBody<DeviceToken>(event, "deviceToken");
    const { deviceToken } = body;

    await linkDeviceToken(client, env.TABLE_NAME, deviceToken, uuid);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    logger.error("[linkDeviceToken] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
