import {
  DeleteCommand,
  type DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  formatErrorResponse,
  formatResponse,
} from "../../shared/formatResponse";
import { getAuthenticatedSub } from "../../shared/getAuthenticatedSub";
import { logger } from "../../shared/logger";
import type { NoteHandlerEnv } from "../schemas";

/**
 * Handles DELETE /notes/users/{uuid}/{ref}
 *
 * Deletes the signed-in user's note. The caller's identity comes from the
 * Cognito `sub` claim, and the path uuid must match it. Re-counts remaining
 * notes and updates the account's totalNotes. Idempotent — a note that does
 * not exist is treated as already deleted.
 */
export const deleteUserNoteHandler = async (
  client: DynamoDBDocumentClient,
  env: NoteHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  logger.debug(`[deleteUserNote] Entering handler`);

  try {
    const sub = getAuthenticatedSub(event);
    if (!sub) {
      return formatErrorResponse("Unauthorized", 401);
    }

    const pathUuid = event.pathParameters?.uuid ?? "";
    if (pathUuid && pathUuid !== sub) {
      return formatErrorResponse("Forbidden", 403);
    }

    const uuid = sub;
    const ref = event.pathParameters?.ref ?? "";
    const date = event.queryStringParameters?.date ?? "";
    const sk = `${ref}#${date}`;
    logger.debug(`[deleteUserNote] Deleting note`, { uuid, ref, date, sk });

    await client.send(
      new DeleteCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: uuid, sk },
        ConditionExpression:
          "attribute_not_exists(#pk) OR attribute_not_exists(#uuid) OR #uuid = :uuid",
        ExpressionAttributeNames: { "#pk": "pk", "#uuid": "uuid" },
        ExpressionAttributeValues: { ":uuid": uuid },
      }),
    );

    logger.debug(`[deleteUserNote] Note deleted, re-counting`, { uuid });

    const queryResult = await client.send(
      new QueryCommand({
        TableName: env.TABLE_NAME,
        IndexName: "user-notes-index",
        KeyConditionExpression: "#uid = :uid",
        ExpressionAttributeNames: { "#uid": "uuid" },
        ExpressionAttributeValues: { ":uid": uuid },
        Select: "COUNT",
      }),
    );

    await client.send(
      new UpdateCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: uuid, sk: "account" },
        UpdateExpression: "SET totalNotes = :count",
        ExpressionAttributeValues: { ":count": queryResult.Count ?? 0 },
      }),
    );

    logger.info(`[deleteUserNote] Note deleted successfully`, { uuid, ref });
    return formatResponse({ success: true });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      return formatErrorResponse("Forbidden", 403);
    }

    logger.error(`[deleteUserNote] Error:`, error);
    return formatErrorResponse("Internal server error");
  }
};
