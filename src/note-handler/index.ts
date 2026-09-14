import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../shared/logger";
import { deleteReactionHandler } from "./deleteReaction/index";
import { deleteReplyHandler } from "./deleteReply/index";
import { deleteUserNoteHandler } from "./deleteUserNote/index";
import { getProverbNotesHandler } from "./getProverbNotes/index";
import { getReactionsHandler } from "./getReactions/index";
import { getRepliesHandler } from "./getReplies/index";
import { getUserNoteHandler } from "./getUserNote/index";
import { getUserNotesHandler } from "./getUserNotes/index";
import { postReplyHandler } from "./postReply/index";
import { postUserNoteHandler } from "./postUserNote/index";
import { putReactionHandler } from "./putReaction/index";
import { NoteHandlerEnvSchema } from "./schemas";

/**
 * Routes incoming API Gateway requests to the appropriate note handler
 * based on the resource path and HTTP method.
 *
 * Resources:
 *  - GET  /notes/proverbs/{ref}     → getProverbNotes
 *  - GET  /notes/users/{uuid}       → getUserNotes
 *  - GET  /notes/users/{uuid}/{ref} → getUserNote
 *  - POST /notes/users/{uuid}/{ref} → postUserNote
 *  - DELETE /notes/users/{uuid}/{ref} → deleteUserNote
 *  - PUT    /notes/users/{uuid}/{ref}/reactions         → putReaction
 *  - DELETE /notes/users/{uuid}/{ref}/reactions         → deleteReaction
 *  - GET    /notes/users/{uuid}/{ref}/reactions         → getReactions
 *  - POST   /notes/users/{uuid}/{ref}/replies           → postReply
 *  - GET    /notes/users/{uuid}/{ref}/replies           → getReplies
 *  - DELETE /notes/users/{uuid}/{ref}/replies           → deleteReply (replySk via query param)
 */
export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  logger.debug(
    `[note-handler] Routing request: ${event.httpMethod} ${event.resource}`,
    {
      pathParams: event.pathParameters,
      queryParams: event.queryStringParameters,
    },
  );

  try {
    const env = NoteHandlerEnvSchema.parse(process.env);
    const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

    const route = `${event.httpMethod} ${event.resource}`;
    switch (route) {
      case "GET /notes/proverbs/{ref}":
        return getProverbNotesHandler(client, env, event);
      case "GET /notes/users/{uuid}":
        return getUserNotesHandler(client, env, event);
      case "GET /notes/users/{uuid}/{ref}":
        return getUserNoteHandler(client, env, event);
      case "POST /notes/users/{uuid}/{ref}":
        return postUserNoteHandler(client, env, event);
      case "DELETE /notes/users/{uuid}/{ref}":
        return deleteUserNoteHandler(client, env, event);
      case "PUT /notes/users/{uuid}/{ref}/reactions":
        return putReactionHandler(client, env, event);
      case "DELETE /notes/users/{uuid}/{ref}/reactions":
        return deleteReactionHandler(client, env, event);
      case "GET /notes/users/{uuid}/{ref}/reactions":
        return getReactionsHandler(client, env, event);
      case "POST /notes/users/{uuid}/{ref}/replies":
        return postReplyHandler(client, env, event);
      case "GET /notes/users/{uuid}/{ref}/replies":
        return getRepliesHandler(client, env, event);
      case "DELETE /notes/users/{uuid}/{ref}/replies":
        return deleteReplyHandler(client, env, event);
      default:
        logger.warn(`[note-handler] Unsupported route: ${route}`);
        return {
          statusCode: 405,
          body: JSON.stringify({ error: "Method not allowed" }),
        };
    }
  } catch (error) {
    logger.error(`[note-handler] Unhandled error:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
