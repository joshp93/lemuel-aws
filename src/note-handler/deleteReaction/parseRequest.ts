import type { APIGatewayProxyEvent } from "aws-lambda";

/**
 * Parses the DELETE /notes/users/{uuid}/{ref}/reactions request.
 * Extracts the Cognito user's sub claim and the `date` query parameter.
 *
 * @param event - The API Gateway proxy event with Cognito authorizer claims
 * @returns Parsed request fields used by the handler
 */
export const parseDeleteReactionRequest = (
  event: APIGatewayProxyEvent,
): { noteAuthorUuid: string; ref: string; userId: string; date: string } => {
  const noteAuthorUuid = event.pathParameters?.uuid ?? "";
  const ref = event.pathParameters?.ref ?? "";
  const claims = event.requestContext.authorizer?.claims as
    | Record<string, string>
    | undefined;
  const userId = claims?.sub ?? "";
  const date = event.queryStringParameters?.date ?? "";
  return { noteAuthorUuid, ref, userId, date };
};
