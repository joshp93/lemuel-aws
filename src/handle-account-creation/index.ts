import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { buildAccountRecord } from "./factories/buildAccountRecord";
import { CreateAccountEnvSchema, CreateAccountResponseSchema } from "./schemas";

/**
 * Creates a backend account record for a newly signed-up user.
 * Idempotent — if the record already exists it returns success without
 * overwriting the existing data.
 */
export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const env = CreateAccountEnvSchema.parse(process.env);
    const uuid = event.pathParameters?.uuid;

    if (!uuid) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "uuid path parameter is required" }),
      };
    }

    const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

    const existing = await client.send(
      new GetCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: uuid, sk: "account" },
      }),
    );

    if (existing.Item) {
      const response = CreateAccountResponseSchema.parse({ success: true });
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

    const response = CreateAccountResponseSchema.parse({ success: true });

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("Error creating account:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
