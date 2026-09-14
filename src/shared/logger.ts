import { Logger } from "@aws-lambda-powertools/logger";

const UUID_PATTERN = /^[a-f0-9-]{20,}$/i;

/** Truncates a string to its first 8 characters followed by "...". */
function truncate(value: string): string {
  return `${value.slice(0, 8)}...`;
}

/**
 * Recursively processes a context object, truncating values that are
 * sensitive: any string value whose property key is exactly `"token"`,
 * or any string value that looks like a UUID (20+ hex/dash characters).
 */
function truncateContext(
  context: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (
      typeof value === "string" &&
      (key === "token" || (value.length >= 20 && UUID_PATTERN.test(value)))
    ) {
      result[key] = truncate(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

const powertoolsLogger = new Logger({ serviceName: "lemuel" });

/**
 * Application-wide logger built on `@aws-lambda-powertools/logger`.
 *
 * Automatically truncates sensitive values before they reach CloudWatch:
 * - Object properties named `"token"` are truncated regardless of format.
 * - Any string value matching a UUID pattern (20+ hex/dash characters) is truncated.
 *
 * Usage:
 *   logger.info("Note saved", { uuid, ref });
 *   logger.error("Operation failed", error);
 *   logger.debug("Entering handler");
 */
export const logger = {
  /** Log at DEBUG level. */
  debug: (message: string, extra?: unknown) => {
    if (extra === undefined) {
      powertoolsLogger.debug(message);
    } else if (extra instanceof Error) {
      powertoolsLogger.debug(message, extra);
    } else if (typeof extra === "object" && extra !== null) {
      powertoolsLogger.debug(
        message,
        truncateContext(extra as Record<string, unknown>),
      );
    } else if (typeof extra === "string") {
      powertoolsLogger.debug(
        message,
        UUID_PATTERN.test(extra) ? truncate(extra) : extra,
      );
    }
  },
  /** Log at INFO level. */
  info: (message: string, extra?: unknown) => {
    if (extra === undefined) {
      powertoolsLogger.info(message);
    } else if (extra instanceof Error) {
      powertoolsLogger.info(message, extra);
    } else if (typeof extra === "object" && extra !== null) {
      powertoolsLogger.info(
        message,
        truncateContext(extra as Record<string, unknown>),
      );
    } else if (typeof extra === "string") {
      powertoolsLogger.info(
        message,
        UUID_PATTERN.test(extra) ? truncate(extra) : extra,
      );
    }
  },
  /** Log at WARN level. */
  warn: (message: string, extra?: unknown) => {
    if (extra === undefined) {
      powertoolsLogger.warn(message);
    } else if (extra instanceof Error) {
      powertoolsLogger.warn(message, extra);
    } else if (typeof extra === "object" && extra !== null) {
      powertoolsLogger.warn(
        message,
        truncateContext(extra as Record<string, unknown>),
      );
    } else if (typeof extra === "string") {
      powertoolsLogger.warn(
        message,
        UUID_PATTERN.test(extra) ? truncate(extra) : extra,
      );
    }
  },
  /** Log at ERROR level. */
  error: (message: string, extra?: unknown) => {
    if (extra === undefined) {
      powertoolsLogger.error(message);
    } else if (extra instanceof Error) {
      powertoolsLogger.error(message, extra);
    } else if (typeof extra === "object" && extra !== null) {
      powertoolsLogger.error(
        message,
        truncateContext(extra as Record<string, unknown>),
      );
    } else if (typeof extra === "string") {
      powertoolsLogger.error(
        message,
        UUID_PATTERN.test(extra) ? truncate(extra) : extra,
      );
    }
  },
};
