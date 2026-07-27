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
    const uuid = event.pathParameters!.uuid!;
    const body = JSON.parse(event.body ?? "{}");
    const { displayName } = body;

    console.log("[createAccount] Request body:", JSON.stringify(body));
    console.log(
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
      console.log("[createAccount] Account already exists, skipping creation");
      const response: CreateAccountResponse = { success: true };
      return {
        statusCode: 200,
        body: JSON.stringify(response),
      };
    }

    const item = buildAccountRecord(uuid, displayName);
    console.log("[createAccount] Storing item:", JSON.stringify(item));

    await client.send(
      new PutCommand({
        TableName: env.TABLE_NAME,
        Item: item,
      }),
    );

    console.log("[createAccount] Account created successfully");
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
