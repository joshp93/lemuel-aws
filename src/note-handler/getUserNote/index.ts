import { type DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { NoteEntitySchema } from "../../models/proverbStoreSchemas";
import type { NoteHandlerEnv } from "../schemas";

/**
 * Handles GET /notes/users/{uuid}/{ref}
 *
 * Fetches a single note by its primary key (pk=uuid, sk=ref).
 * Returns 404 if the note does not exist.
 */
export const getUserNoteHandler = async (
  client: DynamoDBDocumentClient,
  env: NoteHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  console.log(`[getUserNote] Entering handler`);

  try {
    const uuid = event.pathParameters?.uuid ?? "";
    const ref = event.pathParameters?.ref ?? "";
    console.log(`[getUserNote] Fetching note`, { uuid, ref });

    const result = await client.send(
      new GetCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: uuid, sk: ref },
      }),
    );

    if (!result.Item) {
      console.log(`[getUserNote] Note not found`, { uuid, ref });
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Note not found" }),
      };
    }

    const entity = NoteEntitySchema.parse(result.Item);
    console.log(`[getUserNote] Note found`, { uuid, ref });
    return {
      statusCode: 200,
      body: JSON.stringify(entity),
    };
  } catch (error) {
    console.error(`[getUserNote] Error:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
