import {
  type DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ReactionEntitySchema } from "../../models/proverbStoreSchemas";
import { logger } from "../../shared/logger";
import type { NoteHandlerEnv } from "../schemas";
import { parsePutReactionRequest } from "./parseRequest";

/**
 * Handles PUT /notes/users/{uuid}/{ref}/reactions
 *
 * Adds or changes the current user's reaction on a note. Each user can have
 * at most one reaction per note. The reaction entity, a delete-tracking
 * record, and the atomic count update on the parent Note are written together.
 */
export const putReactionHandler = async (
  client: DynamoDBDocumentClient,
  env: NoteHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const { noteAuthorUuid, ref, userId, date, reactionType } =
      parsePutReactionRequest(event);

    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const notePk = `note#${noteAuthorUuid}#${ref}#${date}`;
    const createdAt = new Date().toISOString();

    const existingReaction = await client.send(
      new GetCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: notePk, sk: `reaction#${userId}` },
      }),
    );

    const existingType = existingReaction.Item?.reactionType as
      | string
      | undefined;

    if (existingType === reactionType) {
      return { statusCode: 200, body: JSON.stringify({}) };
    }

    const entity = ReactionEntitySchema.parse({
      pk: notePk,
      sk: `reaction#${userId}`,
      reactionType,
      reactorUuid: userId,
      createdAt,
    });

    await client.send(
      new PutCommand({
        TableName: env.TABLE_NAME,
        Item: entity,
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

    if (existingCounts) {
      const exprs: string[] = [];
      const names: Record<string, string> = {};
      const vals: Record<string, number> = { ":zero": 0 };

      if (existingType) {
        exprs.push(
          "reactionCounts.#old = if_not_exists(reactionCounts.#old, :zero) + :decr",
        );
        names["#old"] = existingType;
        vals[":decr"] = -1;
      }

      exprs.push(
        "reactionCounts.#new = if_not_exists(reactionCounts.#new, :zero) + :incr",
      );
      names["#new"] = reactionType;
      vals[":incr"] = 1;

      await client.send(
        new UpdateCommand({
          TableName: env.TABLE_NAME,
          Key: { pk: noteAuthorUuid, sk: `${ref}#${date}` },
          UpdateExpression: `SET ${exprs.join(", ")}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: vals,
        }),
      );
    } else {
      await client.send(
        new UpdateCommand({
          TableName: env.TABLE_NAME,
          Key: { pk: noteAuthorUuid, sk: `${ref}#${date}` },
          UpdateExpression: "SET reactionCounts = :map",
          ExpressionAttributeValues: { ":map": { [reactionType]: 1 } },
        }),
      );
    }

    if (!existingType) {
      await client.send(
        new PutCommand({
          TableName: env.TABLE_NAME,
          Item: {
            pk: userId,
            sk: `reaction-tracker#${noteAuthorUuid}#${ref}#${date}`,
          },
        }),
      );
    }

    return { statusCode: 200, body: JSON.stringify({}) };
  } catch (error) {
    logger.error("[putReaction] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
