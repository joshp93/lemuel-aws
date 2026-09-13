import { logger } from "../shared/logger";
import { deleteDeviceToken } from "../shared/deviceTokens";
import { sendFcmMessage } from "../shared/fcm";
import { isStaleToken } from "./isStaleToken";

/** Sends the silent push message to every registered device. Stale or
 *  unregistered tokens are silently removed from the table as they are
 *  encountered. Returns the number of stale tokens that were cleaned. */
export const sendToAllDevices = async (
  tokens: string[],
  message: object,
  projectId: string,
  accessToken: string,
  tableName: string,
): Promise<number> => {
  let cleanedCount = 0;

  for (const token of tokens) {
    try {
      logger.debug("[push-daily-proverb] Sending FCM to device", {
        token: token.slice(0, 8),
      });
      const response = await sendFcmMessage(
        token,
        message,
        projectId,
        accessToken,
      );
      logger.debug("[push-daily-proverb] FCM response for device", {
        token: token.slice(0, 8),
        status: response.status,
      });
      if (await isStaleToken(response, token)) {
        logger.info("[push-daily-proverb] Deleting stale token", {
          token: token.slice(0, 8),
        });
        await deleteDeviceToken(tableName, token);
        cleanedCount++;
      }
    } catch (error) {
      logger.error("[push-daily-proverb] FCM send error for token", {
        token: token.slice(0, 8),
        error,
      });
    }
  }

  return cleanedCount;
};
