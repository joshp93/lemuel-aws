import {
  type DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { ReplyEntity } from "../../models/proverbStoreSchemas";
import { ReplyEntitySchema } from "../../models/proverbStoreSchemas";
import type { NoteHandlerEnv } from "../schemas";
import { parseGetRepliesRequest } from "./parseRequest";
import { logger } from "../../shared/logger";

/**
 * Handles GET /notes/users/{uuid}/{ref}/replies
 *
 * Queries all replies for a note, sorted by createdAt ascending (oldest
 * first). Supports cursor-based pagination via limit and lastKey query
 * parameters.
 */
export const getRepliesHandler = async (
  client: DynamoDBDocumentClient,
  env: NoteHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const { noteAuthorUuid, ref, date, limit, exclusiveStartKey } =
      parseGetRepliesRequest(event);

    const notePk = `note#${noteAuthorUuid}#${ref}#${date}`;

    logger.info("[getReplies] Querying", { notePk, noteAuthorUuid, ref, date });

    const result = await client.send(
      new QueryCommand({
        TableName: env.TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
        ExpressionAttributeValues: { ":pk": notePk, ":prefix": "reply" },
        Limit: limit ?? 50,
        ExclusiveStartKey: exclusiveStartKey,
        ScanIndexForward: true,
      }),
    );

    const items = (result.Items ?? []).map((item) =>
      ReplyEntitySchema.parse(item),
    ) as ReplyEntity[];

    let lastKey: string | undefined;
    if (result.LastEvaluatedKey) {
      lastKey = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
        "base64",
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ items, lastKey }),
    };
  } catch (error) {
    logger.error("[getReplies] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
