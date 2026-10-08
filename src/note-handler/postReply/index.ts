import {
  type DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ReplyEntitySchema } from "../../models/proverbStoreSchemas";
import { fetchDisplayName } from "../../shared/fetchAccountDisplayName";
import {
  formatErrorResponse,
  formatResponse,
} from "../../shared/formatResponse";
import { logger } from "../../shared/logger";
import type { NoteHandlerEnv } from "../schemas";
import { parsePostReplyRequest } from "./parseRequest";

/** Prefix every reply sort key carries, ahead of its creation timestamp. */
const REPLY_SK_PREFIX = "reply#";

/**
 * Handles POST /notes/users/{uuid}/{ref}/replies
 *
 * Creates a reply, or overwrites an existing one when `isUpdate` is true. An
 * edit is addressed by the `sk` the client holds for that reply — the same key
 * `GET` handed it — so the exact reply the user edited is the one written.
 * The reply's partition key is derived from the path rather than taken from the
 * request, and the caller must own the reply being overwritten.
 *
 * Creates additionally write a reply-tracker item, bump the note's replyCount
 * and queue a reply notification; edits do none of those.
 */
export const postReplyHandler = async (
  client: DynamoDBDocumentClient,
  env: NoteHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const { noteAuthorUuid, ref, userId, date, content, isUpdate, sk } =
      parsePostReplyRequest(event);

    if (!userId) {
      return formatErrorResponse("Unauthorized", 401);
    }

    const notePk = `note#${noteAuthorUuid}#${ref}#${date}`;

    let entityReplySk: string;
    let createdAt: string;

    if (isUpdate) {
      if (!sk) {
        return formatErrorResponse("Missing reply sort key", 400);
      }

      if (!sk.startsWith(REPLY_SK_PREFIX)) {
        return formatErrorResponse("Invalid reply sort key", 400);
      }

      const existingReply = await client.send(
        new GetCommand({
          TableName: env.TABLE_NAME,
          Key: { pk: notePk, sk },
        }),
      );

      if (!existingReply.Item) {
        return formatErrorResponse("Reply not found", 404);
      }

      if (existingReply.Item.authorUuid !== userId) {
        return formatErrorResponse("Forbidden", 403);
      }

      entityReplySk = sk;
      createdAt = sk.slice(REPLY_SK_PREFIX.length);
    } else {
      createdAt = new Date().toISOString();
      entityReplySk = `${REPLY_SK_PREFIX}${createdAt}`;
    }

    const displayName = await fetchDisplayName(client, env.TABLE_NAME, userId);

    const entity = ReplyEntitySchema.parse({
      pk: notePk,
      sk: entityReplySk,
      content,
      authorUuid: userId,
      displayName,
      createdAt,
    });

    logger.debug("[postReply] Writing reply", {
      pk: notePk,
      sk: entityReplySk,
      noteAuthorUuid,
      ref,
      date,
      isUpdate,
    });

    await client.send(
      new PutCommand({
        TableName: env.TABLE_NAME,
        Item: entity,
      }),
    );

    if (!isUpdate) {
      await client.send(
        new PutCommand({
          TableName: env.TABLE_NAME,
          Item: {
            pk: userId,
            sk: `reply-tracker#${noteAuthorUuid}#${ref}#${date}#${entityReplySk}`,
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

      await client.send(
        new PutCommand({
          TableName: env.TABLE_NAME,
          Item: {
            pk: "reply-notification",
            sk: `${createdAt}#${noteAuthorUuid}`,
            noteAuthorUuid,
            replyAuthorUuid: userId,
            ref,
            date,
            content,
          },
        }),
      );
    }

    return formatResponse(entity);
  } catch (error) {
    logger.error("[postReply] Error:", error);
    return formatErrorResponse("Internal server error");
  }
};
