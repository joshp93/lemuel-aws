import type { APIGatewayProxyEvent } from "aws-lambda";

/**
 * Parses the GET /notes/users/{uuid}/{ref}/replies request.
 *
 * @param event - The API Gateway proxy event
 * @returns Parsed request fields used by the handler
 */
export const parseGetRepliesRequest = (
  event: APIGatewayProxyEvent,
): {
  noteAuthorUuid: string;
  ref: string;
  date: string;
  limit?: number;
  exclusiveStartKey?: Record<string, unknown>;
} => {
  const noteAuthorUuid = event.pathParameters?.uuid ?? "";
  const ref = event.pathParameters?.ref ?? "";
  const date = event.queryStringParameters?.date ?? "";
  const limit = event.queryStringParameters?.limit
    ? parseInt(event.queryStringParameters.limit, 10)
    : undefined;
  const lastKey = event.queryStringParameters?.lastKey;
  const exclusiveStartKey = lastKey
    ? (JSON.parse(Buffer.from(lastKey, "base64").toString()) as Record<
        string,
        unknown
      >)
    : undefined;
  return { noteAuthorUuid, ref, date, limit, exclusiveStartKey };
};
