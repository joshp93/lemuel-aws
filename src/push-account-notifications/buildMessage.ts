import type { FcmReplyPayload } from "./types";

/** Builds the FCM v1 HTTP API message payload for a reply notification.
 *  Includes platform-specific blocks so the notification is associated with
 *  the "replyNotifications" category on both iOS and Android, enabling the
 *  custom "View" action button. */
export const buildMessage = (
  replyAuthorName: string,
  ref: string,
  date: string,
  shortPreview: string,
  noteAuthorUuid: string,
): FcmReplyPayload => ({
  notification: {
    title: `${replyAuthorName} has left a reply on your ${ref} note.`,
    body: shortPreview,
  },
  android: {
    notification: {
      click_action: "replyNotifications",
    },
    priority: "high",
    ttl: "86400s",
  },
  apns: {
    payload: {
      aps: {
        category: "replyNotifications",
        sound: "default",
      },
    },
  },
  data: {
    type: "reply",
    noteAuthorUuid,
    ref,
    date,
    replyAuthorDisplayName: replyAuthorName,
  },
});
