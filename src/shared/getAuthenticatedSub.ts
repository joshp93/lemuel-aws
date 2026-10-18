import type { APIGatewayProxyEvent } from "aws-lambda";

/**
 * Reads the authenticated Cognito user id from the API Gateway authorizer.
 *
 * The `sub` claim is the only value the server can trust for identity; path
 * parameters and request bodies are supplied by the caller.
 *
 * @param event - The API Gateway proxy event.
 * @returns The authenticated user's `sub`, or `undefined` when unauthenticated.
 */
export const getAuthenticatedSub = (
  event: APIGatewayProxyEvent,
): string | undefined => {
  const claims = event.requestContext?.authorizer?.claims as
    | Record<string, string>
    | undefined;
  return claims?.sub || undefined;
};
