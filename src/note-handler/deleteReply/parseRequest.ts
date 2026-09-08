import type { APIGatewayProxyEvent } from "aws-lambda";

/**
 * Parses the DELETE /notes/users/{uuid}/{ref}/replies request.
 * Extracts the Cognito user's sub claim, the date and replySk query parameters,
 * and path parameters.
 *
 * @param event - The API Gateway proxy event with Cognito authorizer claims
 * @returns Parsed request fields used by the handler
 */
export const parseDeleteReplyRequest = (
  event: APIGatewayProxyEvent,
): {
  noteAuthorUuid: string;
  ref: string;
  userId: string;
  date: string;
  replySk: string;
} => {
  const noteAuthorUuid = event.pathParameters?.uuid ?? "";
  const ref = event.pathParameters?.ref ?? "";
  const claims = event.requestContext.authorizer?.claims as
    | Record<string, string>
    | undefined;
  const userId = claims?.sub ?? "";
  const date = event.queryStringParameters?.date ?? "";
  const replySk = event.queryStringParameters?.replySk ?? "";
  return { noteAuthorUuid, ref, userId, date, replySk };
};
