import {
  type DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { parseBody } from "../../shared/parseBody";
import type { AccountHandlerEnv, CreateAccountResponse } from "../models";
import { buildAccountRecord } from "./buildAccountRecord";
import type { CreateAccount } from "./models/types";
import { logger } from "../../shared/logger";

export const createAccountHandler = async (
  client: DynamoDBDocumentClient,
  env: AccountHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const uuid = event.pathParameters!.uuid!;
    const body = parseBody<CreateAccount>(event, "displayName");
    const { displayName } = body;

    logger.debug("[createAccount] Request body:", JSON.stringify(body));
    logger.debug(
      "[createAccount] Extracted displayName:",
      JSON.stringify(displayName),
    );

    const existing = await client.send(
      new GetCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: uuid, sk: "account" },
      }),
    );

    if (existing.Item) {
      logger.info("[createAccount] Account already exists, skipping creation");
      const response: CreateAccountResponse = { success: true };
      return {
        statusCode: 200,
        body: JSON.stringify(response),
      };
    }

    const item = buildAccountRecord(uuid, displayName);
    logger.debug("[createAccount] Storing item:", JSON.stringify(item));

    await client.send(
      new PutCommand({
        TableName: env.TABLE_NAME,
        Item: item,
      }),
    );

    logger.info("[createAccount] Account created successfully");
    const response: CreateAccountResponse = { success: true };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    logger.error("[createAccount] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
