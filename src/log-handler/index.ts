import { Logger } from "@aws-lambda-powertools/logger";
import type { LogLevel } from "@aws-lambda-powertools/logger/types";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const logger = new Logger();

const LOG_METHODS: Partial<Record<Lowercase<LogLevel>, typeof logger.info>> = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
};

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body ?? "{}");
    const { level, message, context } = body as {
      level: string;
      message: string;
      context?: Record<string, unknown>;
    };

    const logMessage = message ?? "No message provided";
    const logMethod = level
      ? LOG_METHODS[level.toLowerCase() as Lowercase<LogLevel>]
      : undefined;
    if (logMethod) {
      if (context) {
        logMethod(logMessage, context);
      } else {
        logMethod(logMessage);
      }
    } else {
      logger.info(logMessage, { originalLevel: level });
    }

    return {
      statusCode: 202,
      body: JSON.stringify({ accepted: true }),
    };
  } catch (error) {
    logger.error("Failed to process log entry", { error });
    return {
      statusCode: 202,
      body: JSON.stringify({ accepted: true }),
    };
  }
};
