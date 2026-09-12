/** Builds the FCM v1 HTTP API message payload for a daily-proverb silent push.
 *  The payload contains data only (no display notification) so the message
 *  is delivered silently to the device and handled by the background task. */
export const buildSilentPushMessage = () => ({
  data: {
    type: "daily-proverb",
  },
  android: {
    priority: "high" as const,
    ttl: "86400s",
    collapseKey: "lemuel-daily-proverb",
    direct_boot_ok: true,
  },
  apns: {
    headers: {
      "apns-priority": "10",
    },
    payload: {
      aps: {
        "content-available": 1,
      },
    },
  },
});
