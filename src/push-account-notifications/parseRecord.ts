import type { NotificationRecord } from "./types";

/** Extracts a reply-notification record from a DynamoDB stream INSERT event.
 *  Returns undefined when the record is not a reply-notification INSERT or is
 *  missing required fields. */
export const parseRecord = (
  eventName: string,
  pk: string,
  sk: string,
  newImage: Record<string, { S?: string }> | undefined,
): NotificationRecord | undefined => {
  if (eventName !== "INSERT") return undefined;
  if (pk !== "reply-notification") return undefined;
  if (!newImage) return undefined;

  const noteAuthorUuid = newImage.noteAuthorUuid?.S;
  const replyAuthorUuid = newImage.replyAuthorUuid?.S;
  const ref = newImage.ref?.S;
  const date = newImage.date?.S;
  const content = newImage.content?.S;

  if (!noteAuthorUuid || !replyAuthorUuid || !ref || !date || !content) {
    return undefined;
  }

  return { sk, noteAuthorUuid, replyAuthorUuid, ref, date, content };
};
