import type { APIGatewayProxyEvent } from "aws-lambda";
import { getAuthenticatedSub } from "../../shared/getAuthenticatedSub";

/**
 * Parses the GET /notes/users/{uuid}/{ref}/reactions request.
 * Extracts path parameters and takes the requesting user's identity from the
 * Cognito authorizer, so it is used only to mark that user's own reaction.
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
  const requestingUserId = getAuthenticatedSub(event);
  return { noteAuthorUuid, ref, date, requestingUserId };
};
