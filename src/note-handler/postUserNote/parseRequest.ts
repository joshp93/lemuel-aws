import type { APIGatewayProxyEvent } from "aws-lambda";

/**
 * Extracts and validates the request body for the postUserNote endpoint.
 *
 * @param event - The API Gateway proxy event
 * @returns The parsed note body
 * @throws If the body is invalid or note field is missing
 */
export const parsePostUserNoteRequest = (
  event: APIGatewayProxyEvent,
): { note: string } => {
  console.log(`[postUserNote] Parsing request body`);

  const body = JSON.parse(event.body ?? "{}");

  if (typeof body.note !== "string" || body.note.trim().length === 0) {
    throw new Error("note body parameter is required");
  }

  return { note: body.note };
};
