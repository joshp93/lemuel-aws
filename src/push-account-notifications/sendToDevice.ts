import { logger } from "../shared/logger";
import { deleteDeviceToken } from "../shared/deviceTokens";
import { sendFcmMessage } from "../shared/fcm";
import type { FcmReplyPayload } from "./types";

/** Checks an FCM v1 HTTP API response and returns "stale" when the token is
 *  no longer registered (UNREGISTERED). INVALID_ARGUMENT responses are logged
 *  in full for review but do not trigger a token delete. Returns "ok" for
 *  all other status codes. */
const classifyResponse = async (
  response: Response,
  token: string,
): Promise<"ok" | "stale"> => {
  if (response.status === 404 || response.status === 400) {
    const body = await response.text();
    if (body.includes("UNREGISTERED")) {
      return "stale";
    }
    if (body.includes("INVALID_ARGUMENT")) {
      logger.error("[push-account-notifications] FCM INVALID_ARGUMENT", {
        token: token.slice(0, 8),
        status: response.status,
        body,
      });
    }
  }
  return "ok";
};

/** Sends the FCM notification to a single device token. Stale or unregistered
 *  tokens are silently removed from the table. Individual token failures never
 *  propagate to the caller so they cannot block notification delivery to other
 *  devices owned by the same user. */
export const sendToDevice = async (
  token: string,
  message: FcmReplyPayload,
  projectId: string,
  accessToken: string,
  tableName: string,
): Promise<void> => {
  try {
    const response = await sendFcmMessage(
      token,
      message,
      projectId,
      accessToken,
    );
    logger.debug("[push-account-notifications] FCM response classified", {
      status: response.status,
    });
    const status = await classifyResponse(response, token);
    if (status === "stale") {
      logger.info("[push-account-notifications] Deleting stale token");
      await deleteDeviceToken(tableName, token);
    }
  } catch (error) {
    logger.error("[push-account-notifications] FCM send failed", { error });
  }
};
