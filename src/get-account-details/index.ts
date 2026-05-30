import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AccountEntitySchema } from "../models/proverbStoreSchemas";
import { GetAccountDetailsEnvSchema } from "./schemas";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const env = GetAccountDetailsEnvSchema.parse(process.env);
    const uuid = event.pathParameters?.uuid;

    if (!uuid) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "uuid path parameter is required" }),
      };
    }

    const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

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
    console.error("Error getting account details:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
