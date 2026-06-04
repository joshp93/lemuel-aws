import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { NoteHandlerEnv } from "../schemas";
import { parseGetUserNotesRequest } from "./parseRequest";
import { buildGetUserNotesResponse } from "./buildResponse";

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
  console.log(`[getUserNotes] Entering handler`);

  try {
    const params = parseGetUserNotesRequest(event);
    console.log(`[getUserNotes] Parsed request`, {
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

    console.log(
      `[getUserNotes] Query returned ${result.Items?.length ?? 0} items`,
    );
    return buildGetUserNotesResponse(result);
  } catch (error) {
    console.error(`[getUserNotes] Error:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
