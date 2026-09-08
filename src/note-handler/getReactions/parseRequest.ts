import type { APIGatewayProxyEvent } from "aws-lambda";

/**
 * Parses the GET /notes/users/{uuid}/{ref}/reactions request.
 * Extracts path parameters and the optional `userId` query parameter.
 *
 * @param event - The API Gateway proxy event
 * @returns Parsed request fields used by the handler
 */
export const parseGetReactionsRequest = (
  event: APIGatewayProxyEvent,
): {
  noteAuthorUuid: string;
  ref: string;
  date: string;
  requestingUserId?: string;
} => {
  const noteAuthorUuid = event.pathParameters?.uuid ?? "";
  const ref = event.pathParameters?.ref ?? "";
  const date = event.queryStringParameters?.date ?? "";
  const requestingUserId = event.queryStringParameters?.userId;
  return { noteAuthorUuid, ref, date, requestingUserId };
};
