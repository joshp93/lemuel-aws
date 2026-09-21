import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { linkDeviceToken } from "../../shared/deviceTokens";
import {
  formatErrorResponse,
  formatResponse,
} from "../../shared/formatResponse";
import { logger } from "../../shared/logger";
import { parseBody } from "../../shared/parseBody";
import type { AccountHandlerEnv } from "../models";
import type { DeviceToken } from "./models/types";

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

    return formatResponse({ success: true });
  } catch (error) {
    logger.error("[linkDeviceToken] Error:", error);
    return formatErrorResponse("Internal server error");
  }
};
