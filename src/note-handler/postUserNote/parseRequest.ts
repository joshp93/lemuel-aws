import type { APIGatewayProxyEvent } from "aws-lambda";

/**
 * Extracts the request body for the postUserNote endpoint.
 *
 * Validation is handled by the API Gateway JSON schema (NoteModel),
 * so `note` and `date` are guaranteed to be present.
 *
 * @param event - The API Gateway proxy event
 * @returns The parsed note body
 */
export const parsePostUserNoteRequest = (
  event: APIGatewayProxyEvent,
): { note: string; date: string } => {
  const body = JSON.parse(event.body ?? "{}");
  return { note: body.note, date: body.date };
};
