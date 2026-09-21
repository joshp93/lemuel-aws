import type { APIGatewayProxyResult } from "aws-lambda";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
} as const;

/**
 * Wraps a successful response body with CORS headers and the given status code.
 * Every Lambda handler should use this to build its response so that
 * browser-based clients (including the web app) can read the response.
 *
 * @param body - The response body to serialise as JSON.
 * @param statusCode - HTTP status code (default 200).
 */
export const formatResponse = (
  body: unknown,
  statusCode = 200,
): APIGatewayProxyResult => ({
  statusCode,
  headers: { ...CORS_HEADERS },
  body: JSON.stringify(body),
});

/**
 * Wraps an error response with CORS headers.
 * Calls {@link formatResponse} under the hood.
 *
 * @param error - The error message or object.
 * @param statusCode - HTTP status code (default 500).
 */
export const formatErrorResponse = (
  error: unknown,
  statusCode = 500,
): APIGatewayProxyResult => {
  const message = error instanceof Error ? error.message : String(error);
  return formatResponse({ error: message }, statusCode);
};
