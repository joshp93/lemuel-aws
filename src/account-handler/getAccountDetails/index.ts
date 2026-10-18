import { type DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AccountEntitySchema } from "../../models/proverbStoreSchemas";
import {
  formatErrorResponse,
  formatResponse,
} from "../../shared/formatResponse";
import { getAuthenticatedSub } from "../../shared/getAuthenticatedSub";
import { logger } from "../../shared/logger";
import type { AccountHandlerEnv } from "../models";

/**
 * Handles GET /accounts/{uuid}
 *
 * Returns the signed-in user's account record. The caller's identity comes
 * from the Cognito `sub` claim, and the path uuid must match it.
 */
export const getAccountDetailsHandler = async (
  client: DynamoDBDocumentClient,
  env: AccountHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const sub = getAuthenticatedSub(event);
    if (!sub) {
      return formatErrorResponse("Unauthorized", 401);
    }

    const pathUuid = event.pathParameters?.uuid;
    if (pathUuid && pathUuid !== sub) {
      return formatErrorResponse("Forbidden", 403);
    }

    const uuid = sub;

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
