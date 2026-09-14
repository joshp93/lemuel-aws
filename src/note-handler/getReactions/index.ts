import {
  type DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../shared/logger";
import type { NoteHandlerEnv } from "../schemas";
import { buildGetReactionsResponse } from "./buildResponse";
import { parseGetReactionsRequest } from "./parseRequest";

/**
 * Handles GET /notes/users/{uuid}/{ref}/reactions
 *
 * Queries all reactions for a note by pk prefix and returns the full
 * reaction list enriched with display names, the per-emoji counts, and
 * the requesting user's own reaction type (if any).
 */
export const getReactionsHandler = async (
  client: DynamoDBDocumentClient,
  env: NoteHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const { noteAuthorUuid, ref, date, requestingUserId } =
      parseGetReactionsRequest(event);

    const notePk = `note#${noteAuthorUuid}#${ref}#${date}`;

    const result = await client.send(
      new QueryCommand({
        TableName: env.TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
        ExpressionAttributeValues: { ":pk": notePk, ":prefix": "reaction" },
      }),
    );

    return buildGetReactionsResponse(
      client,
      env.TABLE_NAME,
      result,
      requestingUserId,
    );
  } catch (error) {
    logger.error("[getReactions] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
