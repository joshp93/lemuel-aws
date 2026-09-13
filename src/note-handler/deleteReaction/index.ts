import {
  DeleteCommand,
  type DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { NoteHandlerEnv } from "../schemas";
import { parseDeleteReactionRequest } from "./parseRequest";
import { logger } from "../../shared/logger";

/**
 * Handles DELETE /notes/users/{uuid}/{ref}/reactions
 *
 * Removes the current user's reaction from a note. Deletes the reaction
 * entity, its delete-tracking record, and atomically decrements the
 * reaction count on the parent Note.
 */
export const deleteReactionHandler = async (
  client: DynamoDBDocumentClient,
  env: NoteHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const { noteAuthorUuid, ref, userId, date } =
      parseDeleteReactionRequest(event);

    if (!userId || !date) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing userId or date" }),
      };
    }

    const notePk = `note#${noteAuthorUuid}#${ref}#${date}`;

    const existingReaction = await client.send(
      new GetCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: notePk, sk: `reaction#${userId}` },
      }),
    );

    const emoji = existingReaction.Item?.reactionType as string | undefined;
    if (!emoji) {
      return { statusCode: 200, body: JSON.stringify({}) };
    }

    await client.send(
      new DeleteCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: notePk, sk: `reaction#${userId}` },
      }),
    );

    await client.send(
      new DeleteCommand({
        TableName: env.TABLE_NAME,
        Key: {
          pk: userId,
          sk: `reaction-tracker#${noteAuthorUuid}#${ref}#${date}`,
        },
      }),
    );

    const note = await client.send(
      new GetCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: noteAuthorUuid, sk: `${ref}#${date}` },
      }),
    );

    const existingCounts = note.Item?.reactionCounts as
      | Record<string, number>
      | undefined;

    if (existingCounts?.[emoji] !== undefined && existingCounts[emoji] > 1) {
      await client.send(
        new UpdateCommand({
          TableName: env.TABLE_NAME,
          Key: { pk: noteAuthorUuid, sk: `${ref}#${date}` },
          UpdateExpression: "SET reactionCounts.#e = reactionCounts.#e + :decr",
          ExpressionAttributeNames: { "#e": emoji },
          ExpressionAttributeValues: { ":decr": -1 },
        }),
      );
    } else if (existingCounts) {
      const rest: Record<string, number> = {};
      for (const key of Object.keys(existingCounts)) {
        if (key !== emoji) {
          rest[key] = existingCounts[key];
        }
      }
      await client.send(
        new UpdateCommand({
          TableName: env.TABLE_NAME,
          Key: { pk: noteAuthorUuid, sk: `${ref}#${date}` },
          UpdateExpression: "SET reactionCounts = :map",
          ExpressionAttributeValues: {
            ":map": Object.keys(rest).length ? rest : {},
          },
        }),
      );
    }

    return { statusCode: 200, body: JSON.stringify({}) };
  } catch (error) {
    logger.error("[deleteReaction] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
