import { type DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AccountEntitySchema } from "../../models/proverbStoreSchemas";
import {
  formatErrorResponse,
  formatResponse,
} from "../../shared/formatResponse";
import { logger } from "../../shared/logger";
import type { AccountHandlerEnv } from "../models";

export const getAccountDetailsHandler = async (
  client: DynamoDBDocumentClient,
  env: AccountHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const uuid = event.pathParameters!.uuid;

    const result = await client.send(
      new GetCommand({
        TableName: env.TABLE_NAME,
        Key: {
          pk: uuid,
          sk: "account",
        },
      }),
    );

    if (!result.Item) {
      logger.info("[getAccountDetails] No account found for uuid:", uuid);
      return formatErrorResponse("Account not found", 404);
    }

    const entity = AccountEntitySchema.parse(result.Item);

    return formatResponse(entity);
  } catch (error) {
    logger.error("[getAccountDetails] Error:", error);
    return formatErrorResponse("Internal server error");
  }
};
