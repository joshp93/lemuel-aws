import {
  DeleteCommand,
  type DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  formatErrorResponse,
  formatResponse,
} from "../../shared/formatResponse";
import { logger } from "../../shared/logger";
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
      return formatErrorResponse("Missing required params", 400);
    }

    const notePk = `note#${noteAuthorUuid}#${ref}#${date}`;

    logger.debug("[deleteReply] Looking up reply", {
      notePk,
      replySk,
      noteAuthorUuid,
      ref,
      date,
    });

    const existingReply = await client.send(
      new GetCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: notePk, sk: replySk },
      }),
    );

    if (!existingReply.Item) {
      logger.warn("[deleteReply] Reply not found at key", {
        pk: notePk,
        sk: replySk,
      });
      return formatErrorResponse("Reply not found", 404);
    }

    if (existingReply.Item.authorUuid !== userId) {
      return formatErrorResponse("Forbidden", 403);
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

    return formatResponse({});
  } catch (error) {
    logger.error("[deleteReply] Error:", error);
    return formatErrorResponse("Internal server error");
  }
};
