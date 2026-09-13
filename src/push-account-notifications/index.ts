import { logger } from "../shared/logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { parseDdbRecord } from "../shared/parseDdbRecord";
import { processRecord } from "./processRecord";
import { EnvSchema } from "./schemas";
import type {
  AccountNotificationImage,
  NotificationRecord,
  PipelineContext,
} from "./types";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** Deletes the notification record from the table so it is not processed again
 *  during a future stream read. */
const deleteNotificationRecord = async (
  tableName: string,
  sk: string,
): Promise<void> => {
  await client.send(
    new DeleteCommand({
      TableName: tableName,
      Key: { pk: "reply-notification", sk },
    }),
  );
};

/** Responds to DynamoDB Stream INSERT events for reply-notification records.
 *  Sends FCM push notifications to the note author's devices and removes the
 *  record from the table. Records are kept only when an unexpected error occurs
 *  so the stream retry mechanism replays them.
 *
 *  Records that do not match the reply-notification shape are silently skipped
 *  so other stream consumers (e.g. push-daily-proverb) are not interfered with. */
export const handler = async (event: unknown): Promise<void> => {
  const env = EnvSchema.parse(process.env);

  const ctx: PipelineContext = {
    client,
    tableName: env.TABLE_NAME,
    fcmSecretName: env.FCM_SECRET_NAME,
  };

  const rawRecords: unknown[] =
    (event as { Records?: unknown[] }).Records ?? [];

  for (const rawRecord of rawRecords) {
    const parsed = parseDdbRecord<AccountNotificationImage>(
      rawRecord,
      ["noteAuthorUuid", "replyAuthorUuid", "ref", "date", "content"],
      "reply-notification",
    );

    if (!parsed?.newImage) {
      continue;
    }

    const { newImage: image } = parsed;
    const notificationRecord: NotificationRecord = {
      sk: parsed.sk,
      noteAuthorUuid: image.noteAuthorUuid,
      replyAuthorUuid: image.replyAuthorUuid,
      ref: image.ref,
      date: image.date,
      content: image.content,
    };

    try {
      const result = await processRecord(ctx, notificationRecord);

      if (result.action === "delete") {
        await deleteNotificationRecord(env.TABLE_NAME, notificationRecord.sk);
      }
    } catch (error) {
      logger.error(
        "[push-account-notifications] Unhandled error, record will be retried",
        error,
      );
    }
  }
};
