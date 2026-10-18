import {
  type DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { formatErrorResponse } from "../../shared/formatResponse";
import { getAuthenticatedSub } from "../../shared/getAuthenticatedSub";
import { logger } from "../../shared/logger";
import type { NoteHandlerEnv } from "../schemas";
import { buildGetUserNotesResponse } from "./buildResponse";
import { parseGetUserNotesRequest } from "./parseRequest";

/**
 * Handles GET /notes/users/{uuid}
 *
 * Lists the signed-in user's own notes. The caller's identity comes from the
 * Cognito `sub` claim, and the path uuid must match it. Queries the
 * user-notes-index GSI by that uuid, sorted by dateCreated descending.
 */
export const getUserNotesHandler = async (
  client: DynamoDBDocumentClient,
  env: NoteHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  logger.debug(`[getUserNotes] Entering handler`);

  try {
    const sub = getAuthenticatedSub(event);
    if (!sub) {
      return formatErrorResponse("Unauthorized", 401);
    }

    const pathUuid = event.pathParameters?.uuid ?? "";
    if (pathUuid && pathUuid !== sub) {
      return formatErrorResponse("Forbidden", 403);
    }

    const params = parseGetUserNotesRequest(event);
    logger.debug(`[getUserNotes] Parsed request`, {
      uuid: sub,
      limit: params.limit,
      hasLastKey: !!params.exclusiveStartKey,
      scanForward: params.scanForward,
    });

    const result = await client.send(
      new QueryCommand({
        TableName: env.TABLE_NAME,
        IndexName: "user-notes-index",
        KeyConditionExpression: "#uid = :uid",
        ExpressionAttributeNames: { "#uid": "uuid" },
        ExpressionAttributeValues: { ":uid": sub },
        Limit: params.limit,
        ExclusiveStartKey: params.exclusiveStartKey,
        ScanIndexForward: params.scanForward,
      }),
    );

    logger.info(
      `[getUserNotes] Query returned ${result.Items?.length ?? 0} items`,
    );
    return buildGetUserNotesResponse(client, env.TABLE_NAME, result);
  } catch (error) {
    logger.error(`[getUserNotes] Error:`, error);
    return formatErrorResponse("Internal server error");
  }
};
