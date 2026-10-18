import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { linkDeviceToken } from "../../shared/deviceTokens";
import {
  formatErrorResponse,
  formatResponse,
} from "../../shared/formatResponse";
import { getAuthenticatedSub } from "../../shared/getAuthenticatedSub";
import { logger } from "../../shared/logger";
import { parseBody } from "../../shared/parseBody";
import type { AccountHandlerEnv } from "../models";
import type { DeviceToken } from "./models/types";

/**
 * Handles PUT /accounts/{uuid}/device-tokens
 *
 * Links a device token to the signed-in user's account. The caller's identity
 * comes from the Cognito `sub` claim, and the path uuid must match it.
 */
export const linkDeviceTokenHandler = async (
  client: DynamoDBDocumentClient,
  env: AccountHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const sub = getAuthenticatedSub(event);
    if (!sub) {
      return formatErrorResponse("Unauthorized", 401);
    }

    const pathUuid = event.pathParameters?.uuid;
    if (pathUuid && pathUuid !== sub) {
      return formatErrorResponse("Forbidden", 403);
    }

    const uuid = sub;
    const body = parseBody<DeviceToken>(event, "deviceToken");
    const { deviceToken } = body;

    await linkDeviceToken(client, env.TABLE_NAME, deviceToken, uuid);

    return formatResponse({ success: true });
  } catch (error) {
    logger.error("[linkDeviceToken] Error:", error);
    return formatErrorResponse("Internal server error");
  }
};
