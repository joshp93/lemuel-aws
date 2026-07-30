import {
  DeleteCommand,
  type DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { NoteHandlerEnv } from "../schemas";

/**
 * Handles DELETE /notes/users/{uuid}/{ref}
 *
 * Deletes a note by its primary key (pk=uuid, sk=ref#date).
 * Re-counts remaining notes and updates the account's totalNotes.
 * Idempotent — does not error if the note does not exist.
 */
export const deleteUserNoteHandler = async (
  client: DynamoDBDocumentClient,
  env: NoteHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  console.log(`[deleteUserNote] Entering handler`);

  try {
    const uuid = event.pathParameters?.uuid ?? "";
    const ref = event.pathParameters?.ref ?? "";
    const date = event.queryStringParameters?.date ?? "";
    const sk = `${ref}#${date}`;
    console.log(`[deleteUserNote] Deleting note`, { uuid, ref, date, sk });

    await client.send(
      new DeleteCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: uuid, sk },
      }),
    );

    console.log(`[deleteUserNote] Note deleted, re-counting`, { uuid });

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

    console.log(`[deleteUserNote] Note deleted successfully`, { uuid, ref });
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error(`[deleteUserNote] Error:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
