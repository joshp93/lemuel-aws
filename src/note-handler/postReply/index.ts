import {
  type DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ReplyEntitySchema } from "../../models/proverbStoreSchemas";
import type { NoteHandlerEnv } from "../schemas";
import { parsePostReplyRequest } from "./parseRequest";

/**
 * Fetches the display name from the author's account entity.
 *
 * @param client - DynamoDBDocumentClient
 * @param tableName - The DynamoDB table name
 * @param authorUuid - The Cognito sub of the reply author
 * @returns The display name, or "" if not found
 */
const fetchDisplayName = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  authorUuid: string,
): Promise<string> => {
  const result = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: authorUuid, sk: "account" },
    }),
  );
  return (result.Item?.displayName as string) ?? "";
};

/**
 * Handles POST /notes/users/{uuid}/{ref}/replies
 *
 * Creates a reply on a note. Fetches the author's display name from their
 * account entity (denormalizing it into the reply), writes the reply entity
 * and a delete-tracking record, and atomically increments the parent Note's
 * replyCount.
 */
export const postReplyHandler = async (
  client: DynamoDBDocumentClient,
  env: NoteHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const { noteAuthorUuid, ref, userId, date, content } =
      parsePostReplyRequest(event);

    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const createdAt = new Date().toISOString();
    const displayName = await fetchDisplayName(client, env.TABLE_NAME, userId);
    const notePk = `note#${noteAuthorUuid}#${ref}#${date}`;
    const replySk = `reply#${createdAt}`;

    const entity = ReplyEntitySchema.parse({
      pk: notePk,
      sk: replySk,
      content,
      authorUuid: userId,
      displayName,
      createdAt,
    });

    console.log("[postReply] Writing reply", {
      pk: notePk,
      sk: replySk,
      noteAuthorUuid,
      ref,
      date,
    });

    await client.send(
      new PutCommand({
        TableName: env.TABLE_NAME,
        Item: entity,
      }),
    );

    await client.send(
      new PutCommand({
        TableName: env.TABLE_NAME,
        Item: {
          pk: userId,
          sk: `reply-tracker#${noteAuthorUuid}#${ref}#${date}#${replySk}`,
        },
      }),
    );

    await client.send(
      new UpdateCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: noteAuthorUuid, sk: `${ref}#${date}` },
        UpdateExpression: "ADD replyCount :incr",
        ExpressionAttributeValues: { ":incr": 1 },
      }),
    );

    return { statusCode: 200, body: JSON.stringify(entity) };
  } catch (error) {
    console.error("[postReply] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
