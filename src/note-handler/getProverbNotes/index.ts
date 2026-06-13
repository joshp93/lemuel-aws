import {
  type DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { NoteHandlerEnv } from "../schemas";
import { buildGetProverbNotesResponse } from "./buildResponse";
import { parseGetProverbNotesRequest } from "./parseRequest";

/**
 * Handles GET /notes/proverbs/{ref}
 *
 * Queries the proverb-notes-index GSI by proverb reference, sorted by
 * dateCreated descending (most recent first). Supports cursor-based pagination
 * via limit, lastKey, and scanForward query parameters.
 */
export const getProverbNotesHandler = async (
  client: DynamoDBDocumentClient,
  env: NoteHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  console.log(`[getProverbNotes] Entering handler`);

  try {
    const params = parseGetProverbNotesRequest(event);
    console.log(`[getProverbNotes] Parsed request`, {
      ref: params.ref,
      limit: params.limit,
      hasLastKey: !!params.exclusiveStartKey,
      scanForward: params.scanForward,
    });

    const result = await client.send(
      new QueryCommand({
        TableName: env.TABLE_NAME,
        IndexName: "proverb-notes-index",
        KeyConditionExpression: "#reference = :reference",
        ExpressionAttributeNames: { "#reference": "ref" },
        ExpressionAttributeValues: { ":reference": params.ref },
        Limit: params.limit,
        ExclusiveStartKey: params.exclusiveStartKey,
        ScanIndexForward: params.scanForward,
      }),
    );

    console.log(
      `[getProverbNotes] Query returned ${result.Items?.length ?? 0} items`,
    );
    return buildGetProverbNotesResponse(result);
  } catch (error) {
    console.error(`[getProverbNotes] Error:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
