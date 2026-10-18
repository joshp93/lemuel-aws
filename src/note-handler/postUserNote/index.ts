import {
  type DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { NoteEntitySchema } from "../../models/proverbStoreSchemas";
import {
  formatErrorResponse,
  formatResponse,
} from "../../shared/formatResponse";
import { getAuthenticatedSub } from "../../shared/getAuthenticatedSub";
import { logger } from "../../shared/logger";
import type { NoteHandlerEnv } from "../schemas";
import { parsePostUserNoteRequest } from "./parseRequest";

/**
 * Handles POST /notes/users/{uuid}/{ref}
 *
 * Creates or updates the signed-in user's note for a proverb and date. The
 * caller's identity comes from the Cognito `sub` claim, and the path uuid must
 * match it. The write updates the note's content fields only, so an existing
 * note keeps its reaction counts and reply count.
 */
export const postUserNoteHandler = async (
  client: DynamoDBDocumentClient,
  env: NoteHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  logger.debug(`[postUserNote] Entering handler`);

  try {
    const sub = getAuthenticatedSub(event);
    if (!sub) {
      return formatErrorResponse("Unauthorized", 401);
    }

    const pathUuid = event.pathParameters?.uuid ?? "";
    if (pathUuid && pathUuid !== sub) {
      return formatErrorResponse("Forbidden", 403);
    }

    const uuid = sub;
    const ref = event.pathParameters?.ref ?? "";
    const body = parsePostUserNoteRequest(event);

    const dateCreated = new Date().toISOString();
    logger.debug(`[postUserNote] Creating note`, { uuid, ref, dateCreated });

    const result = await client.send(
      new UpdateCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: uuid, sk: `${ref}#${body.date}` },
        UpdateExpression:
          "SET #note = :note, #date = :date, #dateCreated = :dateCreated, #ref = :ref, #isPrivate = :isPrivate, #uuid = :uuid",
        ConditionExpression:
          "attribute_not_exists(#pk) OR attribute_not_exists(#uuid) OR #uuid = :uuid",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#note": "note",
          "#date": "date",
          "#dateCreated": "dateCreated",
          "#ref": "ref",
          "#isPrivate": "isPrivate",
          "#uuid": "uuid",
        },
        ExpressionAttributeValues: {
          ":note": body.note,
          ":date": body.date,
          ":dateCreated": dateCreated,
          ":ref": ref,
          ":isPrivate": body.isPrivate,
          ":uuid": uuid,
        },
        ReturnValues: "ALL_NEW",
      }),
    );

    const entity = NoteEntitySchema.parse(result.Attributes);

    const queryResult = await client.send(
      new QueryCommand({
        TableName: env.TABLE_NAME,
        IndexName: "user-notes-index",
        KeyConditionExpression: "#uid = :uid",
        ExpressionAttributeNames: { "#uid": "uuid" },
        ExpressionAttributeValues: { ":uid": uuid },
        Select: "COUNT",
      }),
    );

    await client.send(
      new UpdateCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: uuid, sk: "account" },
        UpdateExpression: "SET totalNotes = :count",
        ExpressionAttributeValues: { ":count": queryResult.Count ?? 0 },
      }),
    );

    logger.info(`[postUserNote] Note saved successfully`, { uuid, ref });
    return formatResponse(entity);
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      return formatErrorResponse("Forbidden", 403);
    }

    logger.error(`[postUserNote] Error:`, error);
    return formatErrorResponse("Internal server error");
  }
};
