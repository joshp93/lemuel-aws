import type { APIGatewayProxyEvent } from "aws-lambda";

/**
 * Extracts and validates path parameters and pagination query parameters
 * for the getUserNotes endpoint.
 *
 * @param event - The API Gateway proxy event
 * @returns Parsed uuid, limit, exclusiveStartKey, and scanForward
 */
export const parseGetUserNotesRequest = (
  event: APIGatewayProxyEvent,
): {
  uuid: string;
  limit?: number;
  exclusiveStartKey?: Record<string, unknown>;
  scanForward: boolean;
} => {
  console.log(`[getUserNotes] Parsing request`, {
    pathParams: event.pathParameters,
    queryParams: event.queryStringParameters,
  });

  const uuid = event.pathParameters?.uuid ?? "";
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

  return { uuid, limit, exclusiveStartKey, scanForward };
};
