import { APIGatewayProxyEvent } from "aws-lambda";

/**
 * Extracts and validates path parameters and pagination query parameters
 * for the getProverbNotes endpoint.
 *
 * @param event - The API Gateway proxy event
 * @returns Parsed ref, limit, exclusiveStartKey, and scanForward
 */
export const parseGetProverbNotesRequest = (
  event: APIGatewayProxyEvent,
): {
  ref: string;
  limit?: number;
  exclusiveStartKey?: Record<string, unknown>;
  scanForward: boolean;
} => {
  console.log(`[getProverbNotes] Parsing request`, {
    pathParams: event.pathParameters,
    queryParams: event.queryStringParameters,
  });

  const ref = event.pathParameters?.ref ?? "";
  const scanForward =
    event.queryStringParameters?.scanForward === "true" ? true : false;

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

  return { ref, limit, exclusiveStartKey, scanForward };
};
