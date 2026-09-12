/** Checks an FCM v1 HTTP API response and returns true when the token is
 *  stale — UNREGISTERED means the token is no longer valid and should be
 *  removed. INVALID_ARGUMENT responses are logged in full for review but do
 *  not trigger a token delete. */
export const isStaleToken = async (
  response: Response,
  token?: string,
): Promise<boolean> => {
  if (response.status === 404 || response.status === 400) {
    const body = await response.text();
    if (body.includes("UNREGISTERED")) {
      return true;
    }
    if (body.includes("INVALID_ARGUMENT")) {
      console.error("[push-daily-proverb] FCM INVALID_ARGUMENT", {
        token: token?.slice(0, 8),
        status: response.status,
        body,
      });
    }
  }
  return false;
};
