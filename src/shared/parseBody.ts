import type { APIGatewayProxyEvent } from "aws-lambda";

/**
 * Parses the request body from an API Gateway event and narrows it to
 * the given type, verifying the specified required key exists in the body.
 * Validation is performed by API Gateway JSON schema models, so the body
 * is trusted at the Lambda layer — the runtime check is an additional
 * safety net.
 *
 * @param event - The API Gateway proxy event
 * @param requiredKey - A key of T that must exist in the parsed body
 * @returns The parsed body narrowed to T
 * @throws If the required key is not present in the parsed body
 */
export const parseBody = <T>(
  event: APIGatewayProxyEvent,
  requiredKey: keyof T,
): T => {
  const body = JSON.parse(event.body ?? "{}");
  if (!(requiredKey in body)) {
    throw new Error(
      `${String(requiredKey)} not in request body. This is probably misconfigured type information in the lambda function.`,
    );
  }
  return body;
};
