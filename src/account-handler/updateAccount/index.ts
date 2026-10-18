import {
  type DynamoDBDocumentClient,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  formatErrorResponse,
  formatResponse,
} from "../../shared/formatResponse";
import { getAuthenticatedSub } from "../../shared/getAuthenticatedSub";
import { logger } from "../../shared/logger";
import type { AccountHandlerEnv } from "../models";
import type { UpdateAccount } from "./models/types";

/**
 * Handles PUT /accounts/{uuid}
 *
 * Updates the signed-in user's account record. The caller's identity comes
 * from the Cognito `sub` claim, and the path uuid must match it.
 */
export const updateAccountHandler = async (
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
    const body = JSON.parse(event.body ?? "{}") as UpdateAccount;

    const updateExpressionParts: string[] = [];
    const expressionAttributeValues: Record<string, unknown> = {};
    const expressionAttributeNames: Record<string, string> = {};

    if (body.displayName !== undefined) {
      updateExpressionParts.push("#displayName = :displayName");
      expressionAttributeValues[":displayName"] = body.displayName;
      expressionAttributeNames["#displayName"] = "displayName";
    }

    if (body.replyNotificationsEnabled !== undefined) {
      updateExpressionParts.push(
        "#replyNotificationsEnabled = :replyNotificationsEnabled",
      );
      expressionAttributeValues[":replyNotificationsEnabled"] =
        body.replyNotificationsEnabled;
      expressionAttributeNames["#replyNotificationsEnabled"] =
        "replyNotificationsEnabled";
    }

    if (updateExpressionParts.length === 0) {
      return formatErrorResponse(
        "At least one field (displayName, replyNotificationsEnabled) must be provided",
        400,
      );
    }

    await client.send(
      new UpdateCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: uuid, sk: "account" },
        UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
      }),
    );

    return formatResponse({ success: true });
  } catch (error) {
    logger.error("[updateAccount] Error:", error);
    return formatErrorResponse("Internal server error");
  }
};
