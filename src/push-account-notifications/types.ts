import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { DdbStreamRecord } from "../shared/parseDdbRecord";

/** Attribute shape of a reply-notification record in DynamoDB. */
export interface AccountNotificationImage {
  noteAuthorUuid: string;
  replyAuthorUuid: string;
  ref: string;
  date: string;
  content: string;
}

/** Fully narrowed DynamoDB Stream record for account notifications. */
export type AccountNotificationRecord =
  DdbStreamRecord<AccountNotificationImage>;

/** Data extracted from a reply-notification DynamoDB stream record. */
export interface NotificationRecord {
  sk: string;
  noteAuthorUuid: string;
  replyAuthorUuid: string;
  ref: string;
  date: string;
  content: string;
}

/** FCM v1 HTTP API payload for a display notification with data. */
export interface FcmReplyPayload {
  notification: {
    title: string;
    body: string;
  };
  android: {
    notification: {
      click_action: string;
    };
    priority: string;
    ttl: string;
  };
  apns: {
    payload: {
      aps: {
        category: string;
        sound: string;
      };
    };
  };
  data: {
    type: string;
    noteAuthorUuid: string;
    ref: string;
    date: string;
    replyAuthorDisplayName: string;
  };
}

/** Result returned by the record processing pipeline.
 *  `action: "delete"` — the record can be safely removed (processed or no-op).
 *  `action: "retry"`  — a transient error occurred; the record should be kept
 *   so the stream retries the batch. */
export type ProcessResult =
  | { action: "delete"; sk: string }
  | { action: "retry"; sk: string };

/** Shared dependencies needed by the record processing pipeline. */
export interface PipelineContext {
  client: DynamoDBDocumentClient;
  tableName: string;
  fcmSecretName: string;
}
