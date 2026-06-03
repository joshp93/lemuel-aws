import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { NoteHandlerEnvSchema } from "./schemas";
import { getProverbNotesHandler } from "./getProverbNotes/index";
import { getUserNoteHandler } from "./getUserNote/index";
import { getUserNotesHandler } from "./getUserNotes/index";
import { postUserNoteHandler } from "./postUserNote/index";

/**
 * Routes incoming API Gateway requests to the appropriate note handler
 * based on the resource path and HTTP method.
 *
 * Resources:
 *  - GET  /notes/proverbs/{ref}     → getProverbNotes
 *  - GET  /notes/users/{uuid}       → getUserNotes
 *  - GET  /notes/users/{uuid}/{ref} → getUserNote
 *  - POST /notes/users/{uuid}/{ref} → postUserNote
 */
export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  console.log(
    `[note-handler] Routing request: ${event.httpMethod} ${event.resource}`,
    { pathParams: event.pathParameters, queryParams: event.queryStringParameters },
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
      default:
        console.warn(`[note-handler] Unsupported route: ${route}`);
        return {
          statusCode: 405,
          body: JSON.stringify({ error: "Method not allowed" }),
        };
    }
  } catch (error) {
    console.error(`[note-handler] Unhandled error:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
