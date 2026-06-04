import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { NoteEntitySchema } from "../../models/proverbStoreSchemas";
import type { NoteHandlerEnv } from "../schemas";
import { parsePostUserNoteRequest } from "./parseRequest";

/**
 * Handles POST /notes/users/{uuid}/{ref}
 *
 * Creates or updates a note for a given user and proverb reference.
 * Automatically sets the dateCreated field to the current ISO timestamp.
 */
export const postUserNoteHandler = async (
  client: DynamoDBDocumentClient,
  env: NoteHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  console.log(`[postUserNote] Entering handler`);

  try {
    const uuid = event.pathParameters?.uuid ?? "";
    const ref = event.pathParameters?.ref ?? "";
    const body = parsePostUserNoteRequest(event);

    const dateCreated = new Date().toISOString();
    console.log(`[postUserNote] Creating note`, { uuid, ref, dateCreated });

    const entity = NoteEntitySchema.parse({
      pk: uuid,
      sk: ref,
      note: body.note,
      dateCreated,
      uuid,
      ref,
    });

    await client.send(
      new PutCommand({
        TableName: env.TABLE_NAME,
        Item: entity,
      }),
    );

    const queryResult = await client.send(
      new QueryCommand({
        TableName: env.TABLE_NAME,
        IndexName: "user-notes-index",
        KeyConditionExpression: "uuid = :uuid",
        ExpressionAttributeValues: { ":uuid": uuid },
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

    console.log(`[postUserNote] Note saved successfully`, { uuid, ref });
    return {
      statusCode: 200,
      body: JSON.stringify(entity),
    };
  } catch (error) {
    console.error(`[postUserNote] Error:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
