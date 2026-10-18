import type { APIGatewayProxyEvent } from "aws-lambda";

/**
 * Builds an API Gateway event carrying Cognito claims for the given `sub`.
 *
 * @param sub - The authenticated user's Cognito id.
 * @param overrides - Event fields to merge over the authenticated defaults.
 * @returns The event, typed as an API Gateway proxy event.
 */
export const authenticatedEvent = (
  sub: string,
  overrides: Partial<APIGatewayProxyEvent> = {},
): APIGatewayProxyEvent =>
  ({
    ...overrides,
    requestContext: {
      authorizer: { claims: { sub } },
    },
  }) as unknown as APIGatewayProxyEvent;
