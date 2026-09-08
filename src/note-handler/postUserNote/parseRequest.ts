import type { APIGatewayProxyEvent } from "aws-lambda";
import { parseBody } from "../../shared/parseBody";
import type { Note } from "./models/types";

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
): { note: string; date: string; isPrivate: boolean } => {
  const body = parseBody<Note>(event, "note");
  return {
    note: body.note,
    date: body.date,
    isPrivate: body.isPrivate ?? false,
  };
};
