import type { APIGatewayProxyEvent } from "aws-lambda";
import { getAuthenticatedSub } from "../../shared/getAuthenticatedSub";
import { logger } from "../../shared/logger";

/**
 * Extracts and validates path parameters and pagination query parameters
 * for the getProverbNotes endpoint. The requesting user's identity is taken
 * from the Cognito authorizer, so private notes can only be included for the
 * signed-in owner.
 *
 * @param event - The API Gateway proxy event
 * @returns Parsed ref, limit, exclusiveStartKey, scanForward, and optional userId
 */
export const parseGetProverbNotesRequest = (
  event: APIGatewayProxyEvent,
): {
  ref: string;
  limit?: number;
  exclusiveStartKey?: Record<string, unknown>;
  scanForward: boolean;
  userId: string | undefined;
} => {
  logger.debug(`[getProverbNotes] Parsing request`, {
    pathParams: event.pathParameters,
    queryParams: event.queryStringParameters,
  });

  const ref = event.pathParameters?.ref ?? "";
  const scanForward = event.queryStringParameters?.scanForward === "true";

  let limit: number | undefined;
  if (event.queryStringParameters?.limit) {
    limit = parseInt(event.queryStringParameters.limit, 10);
  }

  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (event.queryStringParameters?.lastKey) {
    exclusiveStartKey = JSON.parse(
      Buffer.from(event.queryStringParameters.lastKey, "base64").toString(
        "utf-8",
      ),
    );
  }

  const userId = getAuthenticatedSub(event);

  return { ref, limit, exclusiveStartKey, scanForward, userId };
};
