import {
  type DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { NoteHandlerEnv } from "../schemas";
import { buildGetUserNotesResponse } from "./buildResponse";
import { parseGetUserNotesRequest } from "./parseRequest";
import { logger } from "../../shared/logger";

/**
 * Handles GET /notes/users/{uuid}
 *
 * Queries the user-notes-index GSI by user uuid, sorted by dateCreated
 * descending (most recent first). Supports cursor-based pagination via
 * limit, lastKey, and scanForward query parameters.
 */
export const getUserNotesHandler = async (
  client: DynamoDBDocumentClient,
  env: NoteHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  logger.info(`[getUserNotes] Entering handler`);

  try {
    const params = parseGetUserNotesRequest(event);
    logger.info(`[getUserNotes] Parsed request`, {
      uuid: params.uuid,
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
        ExpressionAttributeValues: { ":uid": params.uuid },
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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
