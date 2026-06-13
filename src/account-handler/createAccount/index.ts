import {
  type DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { AccountHandlerEnv, CreateAccountResponse } from "../models";
import { buildAccountRecord } from "./buildAccountRecord";

export const createAccountHandler = async (
  client: DynamoDBDocumentClient,
  env: AccountHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const uuid = event.pathParameters?.uuid;

    if (!uuid) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "uuid path parameter is required" }),
      };
    }

    const existing = await client.send(
      new GetCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: uuid, sk: "account" },
      }),
    );

    if (existing.Item) {
      const response: CreateAccountResponse = { success: true };
      return {
        statusCode: 200,
        body: JSON.stringify(response),
      };
    }

    await client.send(
      new PutCommand({
        TableName: env.TABLE_NAME,
        Item: buildAccountRecord(uuid),
      }),
    );

    const response: CreateAccountResponse = { success: true };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("[createAccount] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
