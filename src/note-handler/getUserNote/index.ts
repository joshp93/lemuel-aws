import { type DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { NoteEntitySchema } from "../../models/proverbStoreSchemas";
import {
  formatErrorResponse,
  formatResponse,
} from "../../shared/formatResponse";
import { logger } from "../../shared/logger";
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
  logger.debug(`[getUserNote] Entering handler`);

  try {
    const uuid = event.pathParameters?.uuid ?? "";
    const ref = event.pathParameters?.ref ?? "";
    const date = event.queryStringParameters?.date ?? "";
    const sk = date ? `${ref}#${date}` : ref;
    logger.debug(`[getUserNote] Fetching note`, { uuid, ref, date, sk });

    const result = await client.send(
      new GetCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: uuid, sk },
      }),
    );

    if (!result.Item) {
      logger.info(`[getUserNote] Note not found`, { uuid, ref });
      return formatErrorResponse("Note not found", 404);
    }

    const entity = NoteEntitySchema.parse(result.Item);

    const accountResult = await client.send(
      new GetCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: uuid, sk: "account" },
      }),
    );

    logger.info(`[getUserNote] Note found`, { uuid, ref });
    return formatResponse({
      ...entity,
      displayName: accountResult.Item?.displayName ?? "",
    });
  } catch (error) {
    logger.error(`[getUserNote] Error:`, { error });
    return formatErrorResponse("Internal server error");
  }
};
