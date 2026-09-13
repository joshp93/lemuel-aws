import { Logger } from "@aws-lambda-powertools/logger";

const UUID_PATTERN = /^[a-f0-9-]{20,}$/i;

function truncate(value: string): string {
  return `${value.slice(0, 8)}...`;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && value.length >= 20 && UUID_PATTERN.test(value);
}

function truncateContext(
  context?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!context) return context;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (isUuid(value)) {
      result[key] = truncate(value);
    } else if (typeof value === "string" && key === "uuid") {
      result[key] = value.length > 12 ? truncate(value) : value;
    } else {
      result[key] = value;
    }
  }
  return result;
}

function truncateExtra(extra: unknown): unknown {
  if (isUuid(extra)) return truncate(extra);
  return extra;
}

const powertoolsLogger = new Logger({ serviceName: "lemuel" });

export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (args.length === 0) {
      powertoolsLogger.debug(message);
    } else if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
      powertoolsLogger.debug(message, truncateContext(args[0] as Record<string, unknown>));
    } else {
      powertoolsLogger.debug(message, truncateExtra(args[0]));
    }
  },
  info: (message: string, ...args: unknown[]) => {
    if (args.length === 0) {
      powertoolsLogger.info(message);
    } else if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
      powertoolsLogger.info(message, truncateContext(args[0] as Record<string, unknown>));
    } else {
      powertoolsLogger.info(message, truncateExtra(args[0]));
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    if (args.length === 0) {
      powertoolsLogger.warn(message);
    } else if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
      powertoolsLogger.warn(message, truncateContext(args[0] as Record<string, unknown>));
    } else {
      powertoolsLogger.warn(message, truncateExtra(args[0]));
    }
  },
  error: (message: string, ...args: unknown[]) => {
    if (args.length === 0) {
      powertoolsLogger.error(message);
    } else if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
      powertoolsLogger.error(message, truncateContext(args[0] as Record<string, unknown>));
    } else {
      powertoolsLogger.error(message, truncateExtra(args[0]));
    }
  },
};