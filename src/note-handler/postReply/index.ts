import {
  type DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ReplyEntitySchema } from "../../models/proverbStoreSchemas";
import { fetchDisplayName } from "../../shared/fetchAccountDisplayName";
import { findReplySk } from "../../shared/findReplySk";
import { logger } from "../../shared/logger";
import type { NoteHandlerEnv } from "../schemas";
import { parsePostReplyRequest } from "./parseRequest";

export const postReplyHandler = async (
  client: DynamoDBDocumentClient,
  env: NoteHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const { noteAuthorUuid, ref, userId, date, content, isUpdate } =
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

    let entityReplySk: string;

    if (isUpdate) {
      entityReplySk = await findReplySk(
        client,
        env.TABLE_NAME,
        userId,
        noteAuthorUuid,
        ref,
        date,
      );
    } else {
      entityReplySk = `reply#${createdAt}`;
    }

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

    return { statusCode: 200, body: JSON.stringify(entity) };
  } catch (error) {
    logger.error("[postReply] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
