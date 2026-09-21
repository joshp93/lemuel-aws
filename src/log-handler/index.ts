import { Logger } from "@aws-lambda-powertools/logger";
import type { LogLevel } from "@aws-lambda-powertools/logger/types";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { formatResponse } from "../shared/formatResponse";
import { parseBody } from "../shared/parseBody";
import type { Log } from "./models/types";

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
    const body = parseBody<Log>(event, "level");
    const { level, message, context } = body;

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

    return formatResponse({ accepted: true }, 202);
  } catch (error) {
    logger.error("Failed to process log entry", { error });
    return formatResponse({ accepted: true }, 202);
  }
};
