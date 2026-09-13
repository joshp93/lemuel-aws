import { logger } from "../shared/logger";
import { queryDeviceTokensByUser } from "../shared/deviceTokens";
import {
  type FcmCredentials,
  getAccessToken,
  getFcmCreds,
} from "../shared/fcm";
import { fetchDisplayName } from "../shared/fetchAccountDisplayName";
import { fetchReplyNotificationsEnabled } from "../shared/fetchReplyNotificationsEnabled";
import { isSelfReply } from "../shared/isSelfReply";
import { truncateReply } from "../shared/truncateReply";
import { buildMessage } from "./buildMessage";
import { sendToDevice } from "./sendToDevice";
import type {
  NotificationRecord,
  PipelineContext,
  ProcessResult,
} from "./types";

/** Processes a single reply-notification record and determines whether the
 *  record should be deleted or kept for a retry.
 *
 *  Normal outcomes (delete): the record is consumed — notifications were sent,
 *  preferences are off, no tokens exist, or the record is malformed.
 *
 *  Error outcomes (retry): an unexpected exception occurred (network failure,
 *  FCM auth error, etc.) — the record stays in the table and the DDB stream
 *  will retry its delivery. */
export const processRecord = async (
  ctx: PipelineContext,
  record: NotificationRecord,
): Promise<ProcessResult> => {
  const { sk, noteAuthorUuid, replyAuthorUuid, ref, date, content } = record;

  if (isSelfReply(replyAuthorUuid, noteAuthorUuid)) {
    logger.info(
      "[push-account-notifications] Self-reply detected, deleting notification record",
    );
    return { action: "delete", sk };
  }

  const enabled = await fetchReplyNotificationsEnabled(
    ctx.client,
    ctx.tableName,
    noteAuthorUuid,
  );

  if (!enabled) {
    logger.info(
      "[push-account-notifications] Reply notifications disabled for note author, deleting record",
    );
    return { action: "delete", sk };
  }

  const replyAuthorName = await fetchDisplayName(
    ctx.client,
    ctx.tableName,
    replyAuthorUuid,
  );

  const tokens = await queryDeviceTokensByUser(ctx.tableName, noteAuthorUuid);

  if (tokens.length === 0) {
    logger.info(
      "[push-account-notifications] No device tokens for note author, deleting record",
    );
    return { action: "delete", sk };
  }

  logger.info(
    "[push-account-notifications] Sending to",
    tokens.length,
    "devices",
  );

  const credentials: FcmCredentials = await getFcmCreds(ctx.fcmSecretName);
  const accessToken = await getAccessToken(credentials);

  if (!accessToken) {
    logger.error(
      "[push-account-notifications] Failed to obtain FCM access token",
    );
    return { action: "retry", sk };
  }

  const shortPreview = truncateReply(content);
  const message = buildMessage(
    replyAuthorName,
    ref,
    date,
    shortPreview,
    noteAuthorUuid,
  );

  for (const { token } of tokens) {
    await sendToDevice(
      token,
      message,
      credentials.project_id,
      accessToken,
      ctx.tableName,
    );
  }

  logger.info(
    "[push-account-notifications] Notifications sent successfully, deleting record",
  );
  return { action: "delete", sk };
};
