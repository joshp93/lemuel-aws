import {
  DeleteCommand,
  type DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { NoteHandlerEnv } from "../schemas";
import { parseDeleteReplyRequest } from "./parseRequest";

/**
 * Handles DELETE /notes/users/{uuid}/{ref}/replies/{replySk}
 *
 * Deletes a reply. Only the reply author may delete. Also deletes the
 * delete-tracking record and atomically decrements the parent Note's
 * replyCount.
 */
export const deleteReplyHandler = async (
  client: DynamoDBDocumentClient,
  env: NoteHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const { noteAuthorUuid, ref, userId, date, replySk } =
      parseDeleteReplyRequest(event);

    if (!userId || !date || !replySk) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required params" }),
      };
    }

    const notePk = `note#${noteAuthorUuid}#${ref}#${date}`;

    console.log("[deleteReply] Looking up reply", {
      notePk,
      replySk,
      noteAuthorUuid,
      ref,
      date,
      rawPathParams: event.pathParameters,
      rawQueryParams: event.queryStringParameters,
      rawResource: event.resource,
    });

    const existingReply = await client.send(
      new GetCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: notePk, sk: replySk },
      }),
    );

    if (!existingReply.Item) {
      console.warn("[deleteReply] Reply not found at key", {
        pk: notePk,
        sk: replySk,
      });
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Reply not found" }),
      };
    }

    if (existingReply.Item.authorUuid !== userId) {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
    }

    await client.send(
      new DeleteCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: notePk, sk: replySk },
      }),
    );

    await client.send(
      new DeleteCommand({
        TableName: env.TABLE_NAME,
        Key: {
          pk: userId,
          sk: `reply-tracker#${noteAuthorUuid}#${ref}#${date}#${replySk}`,
        },
      }),
    );

    await client.send(
      new UpdateCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: noteAuthorUuid, sk: `${ref}#${date}` },
        UpdateExpression: "ADD replyCount :decr",
        ExpressionAttributeValues: { ":decr": -1 },
      }),
    );

    return { statusCode: 200, body: JSON.stringify({}) };
  } catch (error) {
    console.error("[deleteReply] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
