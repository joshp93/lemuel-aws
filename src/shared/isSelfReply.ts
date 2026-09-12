/** Predicate: true when the reply author is the same person who owns the parent note.
 *  When the author replies to their own note, no push notification should be sent. */
export const isSelfReply = (
  replyAuthorUuid: string,
  noteOwnerUuid: string,
): boolean => replyAuthorUuid === noteOwnerUuid;
