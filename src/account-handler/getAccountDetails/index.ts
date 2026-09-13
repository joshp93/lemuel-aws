import { type DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AccountEntitySchema } from "../../models/proverbStoreSchemas";
import type { AccountHandlerEnv } from "../models";
import { logger } from "../../shared/logger";

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
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Account not found" }),
      };
    }

    const entity = AccountEntitySchema.parse(result.Item);

    return {
      statusCode: 200,
      body: JSON.stringify(entity),
    };
  } catch (error) {
    logger.error("[getAccountDetails] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
